/**
 * Google Earth Engine REST API client.
 * Fetches Google Open Buildings V3 polygon data for a study area,
 * providing far better building coverage than OSM for Ghana/Africa.
 *
 * Required env vars:
 *   GEE_SERVICE_ACCOUNT_JSON  — JSON string of a Google service account key
 *                               (with roles/earthengine.viewer on the project)
 *   GEE_PROJECT               — Google Cloud project ID with Earth Engine API enabled
 *
 * If either env var is absent the module throws and the worker falls back to OSM.
 */

import crypto from 'node:crypto';

const GEE_API = 'https://earthengine.googleapis.com/v1';
const OPEN_BUILDINGS_ASSET = 'GOOGLE/Research/open-buildings/v3/polygons';

// ── Service-account OAuth2 token cache ───────────────────────────────────────

interface TokenCache {
    token: string;
    expiresAt: number; // ms timestamp
}

let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
    if (_tokenCache && Date.now() < _tokenCache.expiresAt - 30_000) {
        return _tokenCache.token;
    }

    const saJson = process.env.GEE_SERVICE_ACCOUNT_JSON;
    if (!saJson) throw new Error('GEE_SERVICE_ACCOUNT_JSON not set');

    const sa = JSON.parse(saJson) as {
        client_email: string;
        private_key: string;
    };

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/earthengine.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const key = crypto.createPrivateKey(sa.private_key);
    const sig = crypto.sign('sha256', Buffer.from(signingInput), key).toString('base64url');
    const jwt = `${signingInput}.${sig}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!res.ok) {
        throw new Error(`GEE auth failed ${res.status}: ${await res.text()}`);
    }

    const tokenData = await res.json() as { access_token: string; expires_in: number };
    _tokenCache = {
        token: tokenData.access_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
    };

    return _tokenCache.token;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Approximate a geodesic circle as a 64-vertex GeoJSON Polygon for use as filter geometry */
function circleAsGeoJsonPolygon(lat: number, lon: number, radiusKm: number, steps = 64) {
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusKm / 111.32) * Math.sin(angle);
        const dLon = (radiusKm / (111.32 * Math.cos(lat * (Math.PI / 180)))) * Math.cos(angle);
        coords.push([lon + dLon, lat + dLat]);
    }
    return { type: 'Polygon' as const, coordinates: [coords] };
}

// ── EE expression builder ─────────────────────────────────────────────────────

/**
 * Builds a serialised EE expression that:
 *   1. Loads Open Buildings V3 as a FeatureCollection
 *   2. Filters to features whose geometry intersects the study circle
 *   3. Selects only confidence + area_in_meters properties to keep payload small
 *   4. Converts to a List of at most `maxCount` features
 */
function buildExpression(filterGeometry: object, maxCount: number) {
    return {
        result: '0',
        values: {
            '0': {
                functionInvocationValue: {
                    functionName: 'Collection.toList',
                    arguments: {
                        count: { constantValue: maxCount },
                        collection: {
                            functionInvocationValue: {
                                functionName: 'Collection.select',
                                arguments: {
                                    collection: {
                                        functionInvocationValue: {
                                            functionName: 'Collection.filterBounds',
                                            arguments: {
                                                collection: {
                                                    functionInvocationValue: {
                                                        functionName: 'Collection.loadTable',
                                                        arguments: {
                                                            tableId: { constantValue: OPEN_BUILDINGS_ASSET },
                                                        },
                                                    },
                                                },
                                                geometry: { geometryValue: filterGeometry },
                                            },
                                        },
                                    },
                                    propertySelectors: {
                                        arrayValue: {
                                            values: [
                                                { constantValue: 'confidence' },
                                                { constantValue: 'area_in_meters' },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}

// ── Result parsing ────────────────────────────────────────────────────────────

export interface GeeBuilding {
    /** Negative integer so it doesn't collide with positive OSM IDs */
    osmId: number;
    osmType: 'way';
    tags: {
        building: 'yes';
        source: 'google_open_buildings';
        'building:confidence'?: string;
        'building:area'?: string;
    };
    /** WKT in EPSG:4326 ready for processAndInsertGeometry */
    wkt: string;
}

function geometryToWkt(geom: any): string | null {
    try {
        if (geom.type === 'Polygon') {
            const rings = (geom.coordinates as number[][][]).map((ring) =>
                `(${ring.map(([x, y]) => `${x} ${y}`).join(', ')})`
            );
            return `POLYGON(${rings.join(', ')})`;
        }
        if (geom.type === 'MultiPolygon') {
            const polys = (geom.coordinates as number[][][][]).map((rings) => {
                const ringStrs = rings.map((ring) =>
                    `(${ring.map(([x, y]) => `${x} ${y}`).join(', ')})`
                );
                return `(${ringStrs.join(', ')})`;
            });
            return `MULTIPOLYGON(${polys.join(', ')})`;
        }
        return null;
    } catch {
        return null;
    }
}

function parseEeListResult(data: any): GeeBuilding[] {
    // value:compute for a List<Feature> returns:
    // { result: { arrayValue: { values: [ { dictionaryValue: { values: { geometry, properties } } } ] } } }
    const items: any[] = data?.result?.arrayValue?.values ?? [];
    const buildings: GeeBuilding[] = [];

    for (let i = 0; i < items.length; i++) {
        try {
            const item = items[i]?.dictionaryValue?.values ?? items[i];

            // Geometry may be at item.geometry.geometryValue or unwrapped
            const geomValue =
                item?.geometry?.geometryValue ??
                item?.geometry ??
                null;
            if (!geomValue) continue;

            const wkt = geometryToWkt(geomValue);
            if (!wkt) continue;

            const props = item?.properties?.dictionaryValue?.values ?? {};
            const confidence = props?.confidence?.constantValue as number | undefined;
            const area = props?.area_in_meters?.constantValue as number | undefined;

            buildings.push({
                osmId: -(i + 1),
                osmType: 'way',
                tags: {
                    building: 'yes',
                    source: 'google_open_buildings',
                    ...(confidence !== undefined ? { 'building:confidence': String(confidence.toFixed(3)) } : {}),
                    ...(area !== undefined ? { 'building:area': String(Math.round(area)) } : {}),
                },
                wkt,
            });
        } catch {
            // Skip malformed features silently
        }
    }

    return buildings;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if GEE is configured in the environment */
export function isGeeConfigured(): boolean {
    return !!(process.env.GEE_SERVICE_ACCOUNT_JSON && process.env.GEE_PROJECT);
}

/**
 * Fetch building footprints from Google Open Buildings V3 for a study circle.
 * Throws if GEE env vars are not set or the API call fails.
 */
export async function fetchOpenBuildings(
    lat: number,
    lon: number,
    radiusKm: number,
    maxCount = 5000,
): Promise<GeeBuilding[]> {
    const project = process.env.GEE_PROJECT;
    if (!project) throw new Error('GEE_PROJECT not set');

    const token = await getAccessToken();
    const filterGeometry = circleAsGeoJsonPolygon(lat, lon, radiusKm);
    const expression = buildExpression(filterGeometry, maxCount);

    const res = await fetch(`${GEE_API}/projects/${encodeURIComponent(project)}/value:compute`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GEE value:compute failed ${res.status}: ${text}`);
    }

    const data = await res.json();
    return parseEeListResult(data);
}
