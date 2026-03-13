import { db } from '../db';
import { sql } from 'kysely';
import { z } from 'zod';

// L1 Fix: Zod validation as mandated by Dev Notes
const calculateDensityParamsSchema = z.object({
    jobId: z.string().min(1),
    lat: z.number(),
    lon: z.number(),
    radiusKm: z.number().positive('radiusKm must be positive'),
});

export type CalculateDensityParams = z.infer<typeof calculateDensityParamsSchema>;

export interface CalculateDensityResult {
    jobId: string;
    buildingDensityPct: number;
}

export async function calculateBuildingDensity(params: CalculateDensityParams): Promise<CalculateDensityResult> {
    // L1 Fix: Validate inputs with Zod before any DB interaction
    const { jobId, lat, lon, radiusKm } = calculateDensityParamsSchema.parse(params);

    const radiusMeters = radiusKm * 1000;

    // C1 Fix: Use ST_MakePoint(lon, lat) — naturally parameterized, no string concatenation.
    // H1 Fix: Compute circle area in PostGIS (ST_Area of the buffer) in the same query
    //         so both the intersection area and the denominator are in the same EPSG:5070 space,
    //         eliminating any Euclidean approximation error.
    const result = await db.selectFrom('osmData')
        .select((eb) => [
            sql<number>`
                COALESCE(
                    SUM(
                        ST_Area(
                            ST_Intersection(
                                geom,
                                ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)})
                            )
                        )
                    )
                , 0)
            `.as('intersectedArea'),
            sql<number>`
                ST_Area(
                    ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)})
                )
            `.as('circleArea'),
        ])
        .where('tags', '@>', { building: 'yes' })
        .where(
            sql<boolean>`ST_Intersects(geom, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)}))`
        )
        .executeTakeFirst();

    const intersectedArea = result?.intersectedArea ?? 0;
    // H1 Fix: Use PostGIS-computed area; fall back to Euclidean only if query returns nothing
    const circleArea = result?.circleArea ?? (Math.PI * radiusMeters * radiusMeters);

    const buildingDensityPct = circleArea > 0 ? (intersectedArea / circleArea) * 100 : 0;

    // L2 Fix: Upsert — if same job is retried, update instead of inserting duplicate
    await db.insertInto('urbanParameters')
        .values({
            jobId,
            lat,
            lon,
            radiusKm,
            buildingDensityPct
        })
        .onConflict((oc) =>
            oc.columns(['jobId'] as any).doUpdateSet({ buildingDensityPct })
        )
        .execute();

    return {
        jobId,
        buildingDensityPct
    };
}

export interface CalculateRoadDensityResult {
    jobId: string;
    roadDensity: number; // km/km^2
}

export async function calculateRoadDensity(params: CalculateDensityParams): Promise<CalculateRoadDensityResult> {
    const { jobId, lat, lon, radiusKm } = calculateDensityParamsSchema.parse(params);

    const radiusMeters = radiusKm * 1000;

    const result = await db.selectFrom('osmData')
        .select((eb) => [
            sql<number>`
                COALESCE(
                    SUM(
                        ST_Length(
                            ST_Intersection(
                                geom,
                                ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)})
                            )
                        )
                    )
                , 0)
            `.as('intersectedLengthMeters'),
            sql<number>`
                ST_Area(
                    ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)})
                )
            `.as('circleAreaSqMeters'),
        ])
        .where(sql<boolean>`tags ? 'highway'`)
        .where(
            sql<boolean>`ST_Intersects(geom, ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(${sql.val(lon)}, ${sql.val(lat)}), 4326), 5070), ${sql.val(radiusMeters)}))`
        )
        .executeTakeFirst();

    const intersectedLengthMeters = result?.intersectedLengthMeters ?? 0;
    const circleAreaSqMeters = result?.circleAreaSqMeters ?? (Math.PI * radiusMeters * radiusMeters);

    // AC: Divide total clipped road length (meters) by circle area (m²) -> result in m/m². Multiply by 1,000 to express as km/km².
    const roadDensity = circleAreaSqMeters > 0 ? (intersectedLengthMeters / circleAreaSqMeters) * 1000 : 0;

    await db.insertInto('urbanParameters')
        .values({
            jobId,
            lat,
            lon,
            radiusKm,
            roadDensity
        })
        .onConflict((oc) =>
            oc.columns(['jobId'] as any).doUpdateSet({ roadDensity })
        )
        .execute();

    return {
        jobId,
        roadDensity
    };
}
