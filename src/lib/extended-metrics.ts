/**
 * Extended urban metrics computation using PostGIS queries against stored osm_data.
 *
 * NOTE ON ALIASES: Kysely's CamelCasePlugin converts .as('camelCase') to snake_case in
 * the generated SQL (e.g. 'heightM' → 'height_m'). Raw sql`` templates are NOT transformed.
 * To avoid mismatches, all aliases used inside raw sql`` templates use all-lowercase
 * single-word names (no underscores, no camelCase) so the plugin leaves them unchanged.
 */

import { db } from '../db';
import { sql, type RawBuilder } from 'kysely';
import { z } from 'zod';

const paramsSchema = z.object({
    jobId: z.string().min(1),
    lat: z.number(),
    lon: z.number(),
    radiusKm: z.number().positive(),
});

export type ExtendedMetricsParams = z.infer<typeof paramsSchema>;

export interface ProximityMetrics {
    count: number;
    nearestKm: number | null;
    farthestKm: number | null;
    avgKm: number | null;
    totalKm: number | null;
    /** Combined footprint area of polygon instances within circle (m²) */
    areaMsq: number | null;
}

export interface ExtendedMetrics {
    buildingCount: number;
    buildingCoveragePct: number;
    avgBuildingLevels: number | null;
    avgBuildingHeightM: number | null;
    buildingFootprintM2: number;

    totalRoadLengthKm: number;
    tarredRoadLengthKm: number;
    untarredRoadLengthKm: number;
    sidewalkLengthKm: number;
    roadIntersectionCount: number;

    busStops: ProximityMetrics;
    taxiStations: ProximityMetrics;
    lorryStations: ProximityMetrics;
    markets: ProximityMetrics;
    schools: ProximityMetrics;
    universities: ProximityMetrics;
    hospitals: ProximityMetrics;
    clinics: ProximityMetrics;
    pharmacies: ProximityMetrics;
    banks: ProximityMetrics;
    fuelStations: ProximityMetrics;
    restaurants: ProximityMetrics;
    shops: ProximityMetrics;
    worship: ProximityMetrics;
    police: ProximityMetrics;
    parks: ProximityMetrics;
}

function makeCircle(lon: number, lat: number, radiusMeters: number) {
    return sql`ST_Buffer(
        ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070),
        ${sql.val(radiusMeters)}
    )`;
}

function makeRefPoint(lon: number, lat: number) {
    return sql`ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326)::geography`;
}

async function proximityFor(
    circle: ReturnType<typeof makeCircle>,
    refPoint: ReturnType<typeof makeRefPoint>,
    tagFilter: RawBuilder<boolean>
): Promise<ProximityMetrics> {
    const row = await db
        .selectFrom('osmData')
        .select([
            sql<number>`COUNT(*)`.as('cnt'),
            sql<number>`MIN(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('nearest'),
            sql<number>`MAX(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('farthest'),
            sql<number>`AVG(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('avgdist'),
            sql<number>`SUM(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('totaldist'),
            sql<number>`SUM(CASE
                WHEN GeometryType(geom) IN ('POLYGON','MULTIPOLYGON')
                THEN ST_Area(ST_Intersection(geom, ${circle}))
                ELSE 0
            END)`.as('area'),
        ])
        .where(tagFilter)
        .where(sql<boolean>`ST_Intersects(geom, ${circle})`)
        .executeTakeFirst();

    const count = Number(row?.cnt ?? 0);
    return {
        count,
        nearestKm:  count > 0 && row?.nearest  != null ? Number(row.nearest)  : null,
        farthestKm: count > 0 && row?.farthest != null ? Number(row.farthest) : null,
        avgKm:      count > 0 && row?.avgdist  != null ? Number(row.avgdist)  : null,
        totalKm:    count > 0 && row?.totaldist != null ? Number(row.totaldist) : null,
        areaMsq:    count > 0 && row?.area      ? Number(row.area)      : null,
    };
}

export async function computeExtendedMetrics(params: ExtendedMetricsParams): Promise<ExtendedMetrics> {
    const { lat, lon, radiusKm } = paramsSchema.parse(params);
    const radiusMeters = radiusKm * 1000;

    const circle   = makeCircle(lon, lat, radiusMeters);
    const refPoint = makeRefPoint(lon, lat);

    // ── Buildings — flat single query, all-lowercase aliases ──────────────────
    const bRow = await db
        .selectFrom('osmData')
        .select([
            sql<number>`COUNT(*)`.as('cnt'),
            sql<number>`COALESCE(SUM(ST_Area(ST_Intersection(geom, ${circle}))), 0)`.as('footprint'),
            sql<number>`AVG((tags->>'building:levels')::numeric)`.as('avglvl'),
            sql<number>`AVG((tags->>'building:height')::numeric)`.as('avghtm'),
            sql<number>`ST_Area(${circle})`.as('circlearea'),
        ])
        .where(sql<boolean>`tags ? 'building'`)
        .where(sql<boolean>`ST_Intersects(geom, ${circle})`)
        .executeTakeFirst();

    const buildingCount       = Number(bRow?.cnt        ?? 0);
    const buildingFootprintM2 = Number(bRow?.footprint  ?? 0);
    const circleAreaM2        = Number(bRow?.circlearea ?? (Math.PI * radiusMeters * radiusMeters));
    const buildingCoveragePct = circleAreaM2 > 0 ? (buildingFootprintM2 / circleAreaM2) * 100 : 0;
    const avgBuildingLevels   = bRow?.avglvl != null ? Number(bRow.avglvl) : null;
    const avgBuildingHeightM  = bRow?.avghtm != null ? Number(bRow.avghtm) : null;

    // ── Roads — flat single query, inline CASE expressions ───────────────────
    const rRow = await db
        .selectFrom('osmData')
        .select([
            sql<number>`COALESCE(SUM(
                ST_Length(ST_Transform(ST_Intersection(geom, ${circle}), 4326)::geography) / 1000
            ), 0)`.as('totalkm'),
            sql<number>`COALESCE(SUM(CASE
                WHEN tags->>'surface' IN ('asphalt','paved','concrete','cobblestone','sett')
                THEN ST_Length(ST_Transform(ST_Intersection(geom, ${circle}), 4326)::geography) / 1000
                ELSE 0 END), 0)`.as('tarredkm'),
            sql<number>`COALESCE(SUM(CASE
                WHEN tags->>'surface' IN ('unpaved','dirt','gravel','laterite','sand','ground','compacted','mud')
                THEN ST_Length(ST_Transform(ST_Intersection(geom, ${circle}), 4326)::geography) / 1000
                ELSE 0 END), 0)`.as('untarredkm'),
            sql<number>`COALESCE(SUM(CASE
                WHEN tags->>'highway' IN ('footway','path','steps')
                  OR tags->>'footway' = 'sidewalk'
                THEN ST_Length(ST_Transform(ST_Intersection(geom, ${circle}), 4326)::geography) / 1000
                ELSE 0 END), 0)`.as('sidewalkkm'),
        ])
        .where(sql<boolean>`tags ? 'highway'`)
        .where(sql<boolean>`ST_Intersects(geom, ${circle})`)
        .executeTakeFirst();

    const totalRoadLengthKm    = Number(rRow?.totalkm    ?? 0);
    const tarredRoadLengthKm   = Number(rRow?.tarredkm   ?? 0);
    const untarredRoadLengthKm = Number(rRow?.untarredkm ?? 0);
    const sidewalkLengthKm     = Number(rRow?.sidewalkkm ?? 0);

    // ── Road intersections ────────────────────────────────────────────────────
    let roadIntersectionCount = 0;
    try {
        const ixResult = await db.executeQuery(
            sql`
                WITH clipped AS (
                    SELECT ST_Intersection(geom, ${circle}) AS seg
                    FROM osm_data
                    WHERE tags ? 'highway'
                      AND tags->>'highway' NOT IN ('footway','path','steps','pedestrian','cycleway')
                      AND ST_Intersects(geom, ${circle})
                ),
                noded AS (
                    SELECT (ST_DumpPoints(
                        ST_Node(ST_LineMerge(ST_Collect(seg)))
                    )).geom AS pt
                    FROM clipped
                ),
                snapped AS (
                    SELECT ST_SnapToGrid(pt, 0.0001) AS spt FROM noded
                )
                SELECT COUNT(*) AS cnt
                FROM (
                    SELECT spt FROM snapped GROUP BY spt HAVING COUNT(*) > 1
                ) junctions
            `.compile(db)
        );
        roadIntersectionCount = Number((ixResult.rows[0] as any)?.cnt ?? 0);
    } catch {
        roadIntersectionCount = 0;
    }

    // ── Proximity for all land-use categories ─────────────────────────────────
    const [
        busStops, taxiStations, lorryStations, markets,
        schools, universities, hospitals, clinics, pharmacies,
        banks, fuelStations, restaurants, shops, worship, police, parks,
    ] = await Promise.all([
        proximityFor(circle, refPoint, sql<boolean>`tags->>'highway' = 'bus_stop' OR tags->>'public_transport' IN ('stop_position','platform','station')`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'taxi'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'bus_station' OR (tags->>'public_transport' = 'station' AND tags->>'bus' = 'yes')`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'marketplace'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' IN ('school','kindergarten')`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' IN ('university','college')`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'hospital'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' IN ('clinic','doctors','dentist','health_centre')`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'pharmacy'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' IN ('bank','atm','bureau_de_change')`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'fuel'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' IN ('restaurant','fast_food','cafe','food_court')`),
        proximityFor(circle, refPoint, sql<boolean>`tags ? 'shop'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'place_of_worship'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'amenity' = 'police'`),
        proximityFor(circle, refPoint, sql<boolean>`tags->>'leisure' = 'park' OR tags->>'landuse' IN ('park','forest','grass','recreation_ground')`),
    ]);

    return {
        buildingCount, buildingCoveragePct, avgBuildingLevels, avgBuildingHeightM, buildingFootprintM2,
        totalRoadLengthKm, tarredRoadLengthKm, untarredRoadLengthKm, sidewalkLengthKm, roadIntersectionCount,
        busStops, taxiStations, lorryStations, markets,
        schools, universities, hospitals, clinics, pharmacies,
        banks, fuelStations, restaurants, shops, worship, police, parks,
    };
}
