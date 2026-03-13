import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.createTable('osm_data')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('osm_id', 'bigint', (col) => col.notNull())
        .addColumn('osm_type', 'varchar(20)', (col) => col.notNull())
        .addColumn('tags', 'jsonb')
        // Albers Equal Area Conic (EPSG:5070) for area calculations
        .addColumn('geom', sql`geometry(Geometry, 5070)`)
        .execute();

    await db.schema.createIndex('osm_data_geom_idx')
        .on('osm_data')
        .using('gist')
        .column('geom')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('osm_data').execute();
}
