/**
 * Database type interfaces for Kysely.
 * Extend this as new tables are added via migrations.
 *
 * Convention:
 * - Table interfaces use PascalCase (e.g., UsersTable)
 * - The Database interface maps table names (snake_case) to their interfaces
 * - CamelCasePlugin on the Kysely instance handles snake_case ↔ camelCase conversion automatically
 */

// Placeholder - will be populated as migrations add tables.
// Example format for future tables:
// export interface UsersTable {
//   id: Generated<string>;        // Clerk user_id (string, not uuid)
//   createdAt: Generated<Date>;
//   updatedAt: Date | null;
// }

import { Generated } from 'kysely';

export interface OsmDataTable {
    id: Generated<number>;
    osmId: string | number;
    osmType: string;
    tags: Record<string, any> | null;
    geom: any; // PostGIS geometry
}

export interface UrbanParametersTable {
    id: Generated<number>;
    jobId: string;
    lat: number;
    lon: number;
    radiusKm: number;
    buildingDensityPct: number | null;
    roadDensity: number | null;
    createdAt: Generated<Date>;
}

export interface Database {
    osmData: OsmDataTable;
    urbanParameters: UrbanParametersTable;
}

/** Canonical shorthand for the Database interface */
export type DB = Database;
