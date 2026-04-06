import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from '@/lib/redis';
import { DATA_FETCH_QUEUE_NAME, TestJobData, OsmResponseSchema, addJobSchema } from '@/lib/job-schema';
import crypto from 'node:crypto';
import { processAndInsertGeometry, elementToWkt } from '@/lib/geometry';
import { calculateBuildingDensity, calculateRoadDensity } from '@/lib/density';
import { isGeeConfigured, fetchOpenBuildings } from '@/lib/earth-engine';
import { fetchAllPlacesForArea } from '@/lib/google-places';

type JobReturnData = {
    success: boolean;
    processedAt: string;
    dataStats?: {
        elements: number;
        geeBuildings?: number;
        googlePlaces?: number;
        lowConfidence?: boolean;
    };
};

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'UrbanizeApp/1.0 (contact@urbanize.invalid)';
const USE_GOOGLE_PLACES = !!process.env.GOOGLE_MAPS_API_KEY;

export const worker = new Worker<TestJobData, JobReturnData, string>(
    DATA_FETCH_QUEUE_NAME,
    async (job: Job<TestJobData>) => {
        try {
            console.log(`[Worker] Processing job ${job.id}:`, job.data);

            const validationResult = addJobSchema.safeParse(job.data);
            if (!validationResult.success) {
                throw new UnrecoverableError(`Invalid job payload: ${validationResult.error.message}`);
            }

            // ── Derive spatial parameters ──────────────────────────────────────
            let midLat = job.data.lat || 0;
            let midLon = job.data.lon || 0;
            let radiusKm = job.data.radiusKm || 2;
            let areaSqKm = Math.PI * radiusKm * radiusKm;

            // Build Overpass query. When GEE is active, omit building ways to avoid
            // duplicating geometry we already get from Google Open Buildings.
            // When Google Places is active, omit amenity/shop/leisure nodes.
            let query = job.data.query;

            if (!query && midLat !== undefined && midLon !== undefined && radiusKm !== undefined) {
                const deltaLat = radiusKm / 111.32;
                const deltaLon = radiusKm / (111.32 * Math.cos(midLat * (Math.PI / 180)));
                const bbox = `${midLat - deltaLat},${midLon - deltaLon},${midLat + deltaLat},${midLon + deltaLon}`;
                const dateFilter = job.data.year ? `[date:"${job.data.year}-01-01T00:00:00Z"]` : '';

                const buildingQuery = isGeeConfigured() ? '' : `  way["building"](${bbox});\n`;
                const poiQuery = USE_GOOGLE_PLACES ? '' : [
                    `  node["amenity"](${bbox});`,
                    `  way["amenity"](${bbox});`,
                    `  node["shop"](${bbox});`,
                    `  node["leisure"](${bbox});`,
                    `  node["highway"="bus_stop"](${bbox});`,
                    `  node["public_transport"](${bbox});`,
                    `  node["highway"="taxi"](${bbox});`,
                    `  relation["amenity"="taxi"](${bbox});`,
                    `  node["amenity"="taxi"](${bbox});`,
                ].join('\n');

                query = `[out:json][timeout:90]${dateFilter};
(
${buildingQuery}  way["highway"](${bbox});
${poiQuery}  way["landuse"](${bbox});
);
out geom;`;
            }

            if (!query) {
                throw new UnrecoverableError('No query and no spatial parameters provided');
            }

            // Ensure Overpass returns geometries
            if (!query.includes('geom') && query.includes('out')) {
                query = query.replace(/out(?:([^;\n]*))?;/g, (match, opts) => {
                    return (opts && opts.includes('geom')) ? match : `out ${opts || ''} geom;`.replace(/\s+/g, ' ');
                });
            }

            // Extract bbox from query for area evaluation fallback
            const bboxMatch = query.match(/\(([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\)/);
            if (!job.data.lat && bboxMatch) {
                const parts = bboxMatch.slice(1, 5).map(Number);
                if (parts.length === 4 && !parts.some(isNaN)) {
                    const [minLat, minLon, maxLat, maxLon] = parts;
                    midLat = (minLat + maxLat) / 2;
                    midLon = (minLon + maxLon) / 2;
                    const heightKm = Math.abs(maxLat - minLat) * 111.32;
                    const widthKm = Math.abs(maxLon - minLon) * 111.32 * Math.cos(midLat * (Math.PI / 180));
                    areaSqKm = heightKm * widthKm;
                    radiusKm = Math.hypot(heightKm / 2, widthKm / 2);
                }
            }

            const MIN_EXPECTED_DENSITY_PER_SQ_KM = 5;
            const jobId = job.id || `fallback-${Date.now()}`;

            // ── Overpass cache check ───────────────────────────────────────────
            const cacheKey = `osm_cache:${crypto.createHash('sha256').update(query).digest('hex')}`;
            let cachedValue = null;
            try {
                cachedValue = await redis.get(cacheKey);
            } catch (redisError) {
                console.warn(`[Worker] Redis GET failed for ${cacheKey}:`, redisError instanceof Error ? redisError.message : String(redisError));
            }

            let osmElementCount = 0;

            if (cachedValue) {
                const parsedCache = JSON.parse(cachedValue);
                osmElementCount = parsedCache.elements?.length || 0;

                // Density must still be calculated on cache hit — rows are stored per-job
                try {
                    const br = await calculateBuildingDensity({ jobId, lat: midLat, lon: midLon, radiusKm });
                    console.log(`[Worker] Building density (CACHED) for ${jobId}: ${br.buildingDensityPct.toFixed(2)}%`);
                    const rr = await calculateRoadDensity({ jobId, lat: midLat, lon: midLon, radiusKm });
                    console.log(`[Worker] Road density (CACHED) for ${jobId}: ${rr.roadDensity.toFixed(4)} km/km²`);
                } catch (densityError) {
                    throw new Error(`Failed to calculate density: ${densityError instanceof Error ? densityError.message : String(densityError)}`);
                }

                const density = osmElementCount / (areaSqKm || 1);
                console.log(`[Worker] Job ${jobId} done (CACHED). OSM elements: ${osmElementCount}, density: ${density.toFixed(2)}`);
                return {
                    success: true,
                    processedAt: new Date().toISOString(),
                    dataStats: { elements: osmElementCount, lowConfidence: density < MIN_EXPECTED_DENSITY_PER_SQ_KM },
                };
            }

            // ── Overpass fetch ─────────────────────────────────────────────────
            const timeoutMatch = query.match(/\[timeout:(\d+)\]/);
            const dynamicTimeoutSecs = timeoutMatch ? parseInt(timeoutMatch[1], 10) : 30;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), dynamicTimeoutSecs * 1000);

            let response;
            try {
                response = await fetch(OVERPASS_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': USER_AGENT,
                    },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal,
                });
            } catch (err: any) {
                if (err.name === 'AbortError') throw new Error('Overpass API request timed out');
                throw err;
            } finally {
                clearTimeout(timeoutId);
            }

            if (response.status === 429) {
                console.warn(`[Worker] Overpass rate limit (429) for job ${jobId}`);
                throw new Error('Rate limit exceeded (429)');
            }
            if (!response.ok) {
                throw new UnrecoverableError(`Overpass API error: ${response.status} ${response.statusText}`);
            }

            const json = await response.json();
            const parsedResult = OsmResponseSchema.safeParse(json);
            if (!parsedResult.success) {
                throw new UnrecoverableError(`Malformed Overpass response: ${parsedResult.error.message}`);
            }

            const parsedData = parsedResult.data;
            osmElementCount = parsedData.elements.length;

            // Build OSM geometry rows
            const osmGeometries: { osmId: number; osmType: string; tags: any; wkt: string }[] = [];
            for (const element of parsedData.elements) {
                const wkt = elementToWkt(element);
                if (wkt) {
                    osmGeometries.push({ osmId: element.id, osmType: element.type, tags: element.tags || {}, wkt });
                }
            }

            // ── Google Earth Engine — building footprints ──────────────────────
            let geeBuildings: typeof osmGeometries = [];
            if (isGeeConfigured()) {
                try {
                    const rawBuildings = await fetchOpenBuildings(midLat, midLon, radiusKm);
                    geeBuildings = rawBuildings.map(b => ({
                        osmId: b.osmId,
                        osmType: b.osmType,
                        tags: b.tags,
                        wkt: b.wkt,
                    }));
                    console.log(`[Worker] GEE Open Buildings for job ${jobId}: ${geeBuildings.length} footprints`);
                } catch (geeError) {
                    console.warn(`[Worker] GEE fetch failed, skipping (will use OSM buildings if any):`, geeError instanceof Error ? geeError.message : geeError);
                }
            }

            // ── Google Places — POI nodes ──────────────────────────────────────
            let placesGeometries: typeof osmGeometries = [];
            if (USE_GOOGLE_PLACES && !job.data.year) {
                // Google Places does not support historical queries — skip for Time Travel jobs
                try {
                    const places = await fetchAllPlacesForArea(midLat, midLon, radiusKm);
                    for (let i = 0; i < places.length; i++) {
                        const p = places[i];
                        // Use a deterministic negative ID derived from the place_id hash
                        const hash = crypto.createHash('sha256').update(p.placeId).digest();
                        const osmId = -(Math.abs(hash.readInt32BE(0)) + 1);
                        placesGeometries.push({
                            osmId,
                            osmType: 'node',
                            tags: p.tags,
                            wkt: `POINT(${p.lon} ${p.lat})`,
                        });
                    }
                    console.log(`[Worker] Google Places for job ${jobId}: ${placesGeometries.length} POIs`);
                } catch (placesError) {
                    console.warn(`[Worker] Google Places fetch failed, skipping:`, placesError instanceof Error ? placesError.message : placesError);
                }
            }

            // ── Insert all geometries ──────────────────────────────────────────
            const allGeometries = [...osmGeometries, ...geeBuildings, ...placesGeometries];
            if (allGeometries.length > 0) {
                try {
                    await processAndInsertGeometry(allGeometries, job.data.year);
                    console.log(`[Worker] Inserted ${allGeometries.length} geometries for job ${jobId} (OSM: ${osmGeometries.length}, GEE: ${geeBuildings.length}, Places: ${placesGeometries.length})`);
                } catch (dbError) {
                    throw new Error(`Failed to insert geometries: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
                }
            }

            // ── Density calculations ───────────────────────────────────────────
            try {
                const br = await calculateBuildingDensity({ jobId, lat: midLat, lon: midLon, radiusKm });
                console.log(`[Worker] Building density for job ${jobId}: ${br.buildingDensityPct.toFixed(2)}%`);
            } catch (densityError) {
                throw new Error(`Failed to calculate building density: ${densityError instanceof Error ? densityError.message : String(densityError)}`);
            }

            try {
                const rr = await calculateRoadDensity({ jobId, lat: midLat, lon: midLon, radiusKm });
                console.log(`[Worker] Road density for job ${jobId}: ${rr.roadDensity.toFixed(2)} km/km²`);
            } catch (densityError) {
                throw new Error(`Failed to calculate road density: ${densityError instanceof Error ? densityError.message : String(densityError)}`);
            }

            // ── Cache OSM response ─────────────────────────────────────────────
            try {
                const cachePayload = { ...parsedData, _cachedAt: new Date().toISOString() };
                await redis.set(cacheKey, JSON.stringify(cachePayload), 'EX', 60 * 60 * 24);
            } catch (redisError) {
                console.warn(`[Worker] Redis SET failed for ${cacheKey}:`, redisError instanceof Error ? redisError.message : String(redisError));
            }

            const density = osmElementCount / (areaSqKm || 1);
            console.log(`[Worker] Job ${jobId} done. OSM: ${osmElementCount}, GEE: ${geeBuildings.length}, Places: ${placesGeometries.length}, density: ${density.toFixed(2)}`);

            return {
                success: true,
                processedAt: new Date().toISOString(),
                dataStats: {
                    elements: osmElementCount,
                    geeBuildings: geeBuildings.length,
                    googlePlaces: placesGeometries.length,
                    lowConfidence: density < MIN_EXPECTED_DENSITY_PER_SQ_KM && geeBuildings.length === 0,
                },
            };
        } catch (error: any) {
            console.error(`[Worker] Error processing job ${job.id}:`, error.message);
            throw error;
        }
    },
    {
        connection: redis,
        limiter: {
            max: 1,       // max 1 job
            duration: 2000 // per 2 seconds
        }
    }
);

worker.on('ready', () => {
    console.log('[Worker] Worker is running and connected to Redis');
});

worker.on('completed', (job: Job) => {
    console.log(`[Worker] Job ${job.id} completed. Result:`, job.returnvalue);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
    console.log(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
});
