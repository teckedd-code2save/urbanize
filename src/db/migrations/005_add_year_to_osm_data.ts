import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('osm_data')
        .addColumn('fetched_for_year', 'integer', (col) => col.defaultTo(null))
        .execute();

    // Add index for performant year-based lookups used by the data availability API.
    await sql`
        CREATE INDEX IF NOT EXISTS idx_osm_data_fetched_for_year
        ON osm_data (fetched_for_year);
    `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('osm_data')
        .dropColumn('fetched_for_year')
        .execute();
}
