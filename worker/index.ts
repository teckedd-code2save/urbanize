import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from '@/lib/redis';
import { DATA_FETCH_QUEUE_NAME, TestJobData, OsmResponseSchema, addJobSchema } from '@/lib/job-schema';
import crypto from 'node:crypto';
import { processAndInsertGeometry, elementToWkt } from '@/lib/geometry';
import { calculateBuildingDensity, calculateRoadDensity } from '@/lib/density';

type JobReturnData = {
    success: boolean;
    processedAt: string;
    dataStats?: {
        elements: number;
        lowConfidence?: boolean;
    };
};

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'UrbanizeApp/1.0 (contact@urbanize.invalid)';

export const worker = new Worker<TestJobData, JobReturnData, string>(
    DATA_FETCH_QUEUE_NAME,
    async (job: Job<TestJobData>) => {
        try {
            console.log(`[Worker] Processing job ${job.id}:`, job.data);

            const validationResult = addJobSchema.safeParse(job.data);
            if (!validationResult.success) {
                throw new UnrecoverableError(`Invalid job payload: ${validationResult.error.message}`);
            }

            let query = job.data.query || '[out:json][timeout:25];node(51.5,-0.1,51.51,-0.09);out geom;';
            // Ensure Overpass returns geometries so our WKT generation doesn't fail
            if (!query.includes('geom') && query.includes('out')) {
                query = query.replace(/out(?:([^;\n]*))?;/g, (match, opts) => {
                    return (opts && opts.includes('geom')) ? match : `out ${opts || ''} geom;`.replace(/\s+/g, ' ');
                });
            }

            // Extract bbox for area evaluation: node(minLat,minLon,maxLat,maxLon)
            const bboxMatch = query.match(/\(([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\)/);
            let areaSqKm = 10;
            let midLat = job.data.lat || 0;
            let midLon = job.data.lon || 0;
            let radiusKm = job.data.radiusKm || 2;

            if (job.data.lat && job.data.lon && job.data.radiusKm) {
                areaSqKm = Math.PI * radiusKm * radiusKm;
            } else if (bboxMatch) {
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

            // Parametrize threshold
            const MIN_EXPECTED_DENSITY_PER_SQ_KM = 5;

            // Cache Check
            const cacheKey = `osm_cache:${crypto.createHash('sha256').update(query).digest('hex')}`;
            let cachedValue = null;
            try {
                cachedValue = await redis.get(cacheKey);
            } catch (redisError) {
                console.warn(`[Worker] Redis GET failed for ${cacheKey}, falling back to direct fetch. Error:`, redisError instanceof Error ? redisError.message : String(redisError));
            }

            if (cachedValue) {
                const parsedCache = JSON.parse(cachedValue);
                const elementsCount = parsedCache.elements?.length || 0;

                const density = elementsCount / (areaSqKm || 1);
                const isLowConfidence = density < MIN_EXPECTED_DENSITY_PER_SQ_KM;

                // M2 Fix: Cached path must also calculate and store density.
                // Without this, repeated queries for the same area never persist a density row.
                try {
                    const densityResult = await calculateBuildingDensity({
                        jobId: job.id || `fallback-${Date.now()}`,
                        lat: midLat,
                        lon: midLon,
                        radiusKm
                    });
                    console.log(`[Worker] Calculated Building Density (CACHED path) for job ${job.id}: ${densityResult.buildingDensityPct.toFixed(2)}%`);

                    const roadDensityResult = await calculateRoadDensity({
                        jobId: job.id || `fallback-${Date.now()}`,
                        lat: midLat,
                        lon: midLon,
                        radiusKm
                    });
                    console.log(`[Worker] Calculated Road Density (CACHED path) for job ${job.id}: ${roadDensityResult.roadDensity.toFixed(4)} km/km²`);
                } catch (densityError) {
                    console.error(`[Worker] Error calculating building or road density (CACHED path) for job ${job.id}:`, densityError);
                    throw new Error(`Failed to calculate density: ${densityError instanceof Error ? densityError.message : String(densityError)}`);
                }

                console.log(`[Worker] Finished processing job ${job.id} (CACHED). Elements found: ${elementsCount}, Density: ${density.toFixed(2)}, LowConf: ${isLowConfidence}`);
                return {
                    success: true,
                    processedAt: new Date().toISOString(),
                    dataStats: {
                        elements: elementsCount,
                        lowConfidence: isLowConfidence
                    }
                };
            }

            const timeoutMatch = query.match(/\[timeout:(\d+)\]/);
            const dynamicTimeoutSecs = timeoutMatch ? parseInt(timeoutMatch[1], 10) : 30; // 30s default
            const timeoutMs = dynamicTimeoutSecs * 1000;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            let response;
            try {
                response = await fetch(OVERPASS_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': USER_AGENT
                    },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal
                });
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    throw new Error('Overpass API request timed out');
                }
                throw err;
            } finally {
                clearTimeout(timeoutId);
            }

            if (response.status === 429) {
                console.warn(`[Worker] Overpass API rate limit hit (429) for job ${job.id}`);
                throw new Error('Rate limit exceeded (429)');
            }

            if (!response.ok) {
                throw new UnrecoverableError(`Overpass API error: ${response.status} ${response.statusText}`);
            }

            const json = await response.json();

            const parsedResult = OsmResponseSchema.safeParse(json);
            if (!parsedResult.success) {
                throw new UnrecoverableError(`Malformed Overpass API response: ${parsedResult.error.message}`);
            }

            const parsedData = parsedResult.data;
            const elementsCount = parsedData.elements.length;

            const density = elementsCount / (areaSqKm || 1);
            const isLowConfidence = density < MIN_EXPECTED_DENSITY_PER_SQ_KM;

            // Geometry processing and insertion
            const geometries = [];
            for (const element of parsedData.elements) {
                const wkt = elementToWkt(element);

                if (wkt) {
                    geometries.push({
                        osmId: element.id,
                        osmType: element.type,
                        tags: element.tags || {},
                        wkt
                    });
                }
            }

            if (geometries.length > 0) {
                try {
                    await processAndInsertGeometry(geometries);
                    console.log(`[Worker] Inserted ${geometries.length} geometries for job ${job.id}`);
                } catch (dbError) {
                    console.error(`[Worker] Error inserting geometries for job ${job.id}:`, dbError);
                    throw new Error(`Failed to insert geometries: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
                }
            }

            // Calculate Building Density
            // H3 Fix: radiusKm is now correctly derived above from bbox half-diagonal.
            try {
                const densityResult = await calculateBuildingDensity({
                    jobId: job.id || `fallback-${Date.now()}`,
                    lat: midLat,
                    lon: midLon,
                    radiusKm
                });
                console.log(`[Worker] Calculated Building Density for job ${job.id}: ${densityResult.buildingDensityPct.toFixed(2)}%`);
            } catch (densityError) {
                // H2 Fix: Density failure must propagate — a successful job requires a stored density.
                // Previously swallowed silently (and the comment about caching was backwards —
                // cache write happens AFTER density).
                console.error(`[Worker] Error calculating building density for job ${job.id}:`, densityError);
                throw new Error(`Failed to calculate building density: ${densityError instanceof Error ? densityError.message : String(densityError)}`);
            }

            try {
                const roadDensityResult = await calculateRoadDensity({
                    jobId: job.id || `fallback-${Date.now()}`,
                    lat: midLat,
                    lon: midLon,
                    radiusKm
                });
                console.log(`[Worker] Calculated Road Density for job ${job.id}: ${roadDensityResult.roadDensity.toFixed(2)} km/km²`);
            } catch (densityError) {
                console.error(`[Worker] Error calculating road density for job ${job.id}:`, densityError);
                throw new Error(`Failed to calculate road density: ${densityError instanceof Error ? densityError.message : String(densityError)}`);
            }

            // Cache Write
            try {
                const cachePayload = { ...parsedData, _cachedAt: new Date().toISOString() };
                await redis.set(cacheKey, JSON.stringify(cachePayload), 'EX', 60 * 60 * 24); // Cache for 24 hours
            } catch (redisError) {
                console.warn(`[Worker] Redis SET failed for ${cacheKey}. Error:`, redisError instanceof Error ? redisError.message : String(redisError));
            }

            console.log(`[Worker] Finished processing job ${job.id}. Elements found: ${elementsCount}, Density: ${density.toFixed(2)}, LowConf: ${isLowConfidence}`);
            return {
                success: true,
                processedAt: new Date().toISOString(),
                dataStats: {
                    elements: elementsCount,
                    lowConfidence: isLowConfidence
                }
            };
        } catch (error: any) {
            console.error(`[Worker] Error processing job ${job.id}:`, error.message);
            throw error; // Re-throw to trigger BullMQ failure handling
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
