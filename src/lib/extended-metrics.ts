/**
 * Extended urban metrics computation using PostGIS queries against stored osm_data.
 *
 * Covers all parameters from Edward's requirements that are achievable via OSM:
 * - Buildings: count, coverage, avg height/floors, footprint area
 * - Roads: total/tarred/untarred length, sidewalk length, intersection count
 * - Land uses: count + proximity (nearest/farthest/avg/total distance) for each category
 *
 * Length/distance uses ::geography cast for ellipsoidal accuracy globally.
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
    // ── Buildings ──────────────────────────────────────────────
    buildingCount: number;
    buildingCoveragePct: number;
    avgBuildingLevels: number | null;
    avgBuildingHeightM: number | null;
    buildingFootprintM2: number;

    // ── Roads ──────────────────────────────────────────────────
    totalRoadLengthKm: number;
    tarredRoadLengthKm: number;
    untarredRoadLengthKm: number;
    sidewalkLengthKm: number;
    roadIntersectionCount: number;

    // ── Land uses with counts + proximity ─────────────────────
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
            sql<number>`MIN(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('nearestKm'),
            sql<number>`MAX(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('farthestKm'),
            sql<number>`AVG(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('avgKm'),
            sql<number>`SUM(ST_Distance(ST_Transform(geom, 4326)::geography, ${refPoint})) / 1000`.as('totalKm'),
            sql<number>`SUM(CASE
                WHEN GeometryType(geom) IN ('POLYGON','MULTIPOLYGON')
                THEN ST_Area(ST_Intersection(geom, ${circle}))
                ELSE 0
            END)`.as('areaMsq'),
        ])
        .where(tagFilter)
        .where(sql<boolean>`ST_Intersects(geom, ${circle})`)
        .executeTakeFirst();

    const count = Number(row?.cnt ?? 0);
    return {
        count,
        nearestKm: count > 0 && row?.nearestKm != null ? Number(row.nearestKm) : null,
        farthestKm: count > 0 && row?.farthestKm != null ? Number(row.farthestKm) : null,
        avgKm: count > 0 && row?.avgKm != null ? Number(row.avgKm) : null,
        totalKm: count > 0 && row?.totalKm != null ? Number(row.totalKm) : null,
        areaMsq: count > 0 && row?.areaMsq ? Number(row.areaMsq) : null,
    };
}

export async function computeExtendedMetrics(params: ExtendedMetricsParams): Promise<ExtendedMetrics> {
    const { lat, lon, radiusKm } = paramsSchema.parse(params);
    const radiusMeters = radiusKm * 1000;

    const circle = makeCircle(lon, lat, radiusMeters);
    const refPoint = makeRefPoint(lon, lat);

    // ── Buildings ──────────────────────────────────────────────────────────────
    const bRow = await db
        .selectFrom(
            db.selectFrom('osmData')
                .select([
                    sql<number>`ST_Area(ST_Intersection(geom, ${circle}))`.as('area'),
                    sql<number>`(tags->>'building:levels')::numeric`.as('levels'),
                    sql<number>`(tags->>'building:height')::numeric`.as('heightM'),
                ])
                .where(sql<boolean>`tags ? 'building'`)
                .where(sql<boolean>`ST_Intersects(geom, ${circle})`)
                .as('b')
        )
        .select([
            sql<number>`COUNT(*)`.as('cnt'),
            sql<number>`COALESCE(SUM(area), 0)`.as('footprintM2'),
            sql<number>`AVG(levels)`.as('avgLevels'),
            sql<number>`AVG(heightM)`.as('avgHeightM'),
            sql<number>`ST_Area(${circle})`.as('circleArea'),
        ])
        .executeTakeFirst();

    const buildingCount = Number(bRow?.cnt ?? 0);
    const buildingFootprintM2 = Number(bRow?.footprintM2 ?? 0);
    const circleAreaM2 = Number(bRow?.circleArea ?? (Math.PI * radiusMeters * radiusMeters));
    const buildingCoveragePct = circleAreaM2 > 0 ? (buildingFootprintM2 / circleAreaM2) * 100 : 0;
    const avgBuildingLevels = bRow?.avgLevels != null ? Number(bRow.avgLevels) : null;
    const avgBuildingHeightM = bRow?.avgHeightM != null ? Number(bRow.avgHeightM) : null;

    // ── Roads ──────────────────────────────────────────────────────────────────
    const rRow = await db
        .selectFrom(
            db.selectFrom('osmData')
                .select([
                    sql<number>`
                        ST_Length(ST_Intersection(geom, ${circle})::geography) / 1000
                    `.as('lengthKm'),
                    sql<string>`COALESCE(tags->>'surface', '')`.as('surface'),
                    sql<string>`COALESCE(tags->>'highway', '')`.as('hwType'),
                    sql<string>`COALESCE(tags->>'footway', '')`.as('footway'),
                ])
                .where(sql<boolean>`tags ? 'highway'`)
                .where(sql<boolean>`ST_Intersects(geom, ${circle})`)
                .as('r')
        )
        .select([
            sql<number>`COALESCE(SUM(lengthKm), 0)`.as('totalKm'),
            sql<number>`COALESCE(SUM(CASE WHEN surface IN ('asphalt','paved','concrete','cobblestone','sett') THEN lengthKm ELSE 0 END), 0)`.as('tarredKm'),
            sql<number>`COALESCE(SUM(CASE WHEN surface IN ('unpaved','dirt','gravel','laterite','sand','ground','compacted','mud') THEN lengthKm ELSE 0 END), 0)`.as('untarredKm'),
            sql<number>`COALESCE(SUM(CASE WHEN hwType IN ('footway','path','steps') OR footway = 'sidewalk' THEN lengthKm ELSE 0 END), 0)`.as('sidewalkKm'),
        ])
        .executeTakeFirst();

    const totalRoadLengthKm = Number(rRow?.totalKm ?? 0);
    const tarredRoadLengthKm = Number(rRow?.tarredKm ?? 0);
    const untarredRoadLengthKm = Number(rRow?.untarredKm ?? 0);
    const sidewalkLengthKm = Number(rRow?.sidewalkKm ?? 0);

    // ── Road intersections: points shared by ≥2 road segments after nodding ───
    // Collect all road linestrings clipped to circle, node them (insert crossing vertices),
    // then count points that appear in ≥2 segments — these are the junctions.
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
        // Non-critical — topology operations may fail on sparse data
        roadIntersectionCount = 0;
    }

    // ── Proximity metrics for all land use categories ─────────────────────────
    const [
        busStops,
        taxiStations,
        lorryStations,
        markets,
        schools,
        universities,
        hospitals,
        clinics,
        pharmacies,
        banks,
        fuelStations,
        restaurants,
        shops,
        worship,
        police,
        parks,
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
        buildingCount,
        buildingCoveragePct,
        avgBuildingLevels,
        avgBuildingHeightM,
        buildingFootprintM2,

        totalRoadLengthKm,
        tarredRoadLengthKm,
        untarredRoadLengthKm,
        sidewalkLengthKm,
        roadIntersectionCount,

        busStops,
        taxiStations,
        lorryStations,
        markets,
        schools,
        universities,
        hospitals,
        clinics,
        pharmacies,
        banks,
        fuelStations,
        restaurants,
        shops,
        worship,
        police,
        parks,
    };
}
