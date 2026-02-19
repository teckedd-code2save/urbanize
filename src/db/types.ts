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

export interface Database {
    // Tables will be added here as migrations are applied.
    // Example: users: UsersTable;
}

/** Canonical shorthand for the Database interface */
export type DB = Database;
