import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('urban_parameters')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('job_id', 'varchar', (col) => col.notNull().unique())
        .addColumn('lat', 'double precision', (col) => col.notNull())
        .addColumn('lon', 'double precision', (col) => col.notNull())
        .addColumn('radius_km', 'double precision', (col) => col.notNull())
        .addColumn('building_density_pct', 'double precision')
        .addColumn('road_density', 'double precision')
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
        .execute();

    // unique index is automatically created by the UNIQUE constraint above;
    // keep explicit index for query performance on non-unique lookups if needed.
    await db.schema
        .createIndex('urban_parameters_job_id_idx')
        .on('urban_parameters')
        .column('job_id')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('urban_parameters').execute();
}
