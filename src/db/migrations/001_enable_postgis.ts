import { type Kysely, sql } from 'kysely';

/**
 * Migration 001: Enable PostGIS extension
 *
 * PostGIS is required for all geospatial operations in this project:
 * - ST_MakeValid (geometry autocorrection)
 * - ST_Intersects, ST_Difference (density calculations)
 * - ST_Transform (Albers Equal-Area projection)
 * - Geometry column types (GEOMETRY, GEOGRAPHY)
 */
export async function up(db: Kysely<unknown>): Promise<void> {
    // Enable PostGIS - required before any geometry columns can be created
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db);
}

export async function down(): Promise<void> {
    // NOTE: Dropping PostGIS in production would cascade and destroy all geometry columns.
    // This is intentionally a no-op to prevent accidental data loss.
    // To manually drop: DROP EXTENSION IF EXISTS postgis CASCADE;
}
