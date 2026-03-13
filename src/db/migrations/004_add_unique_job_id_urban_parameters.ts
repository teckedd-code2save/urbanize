import { Kysely, sql } from 'kysely';

/**
 * Add unique constraint to urban_parameters.job_id for upsert safety.
 * Migration 003's CREATE TABLE was updated to include UNIQUE, but this migration
 * handles existing environments where the table was already created without it.
 */
export async function up(db: Kysely<any>): Promise<void> {
    await sql`
        ALTER TABLE urban_parameters
        ADD CONSTRAINT urban_parameters_job_id_key UNIQUE (job_id);
    `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    await sql`
        ALTER TABLE urban_parameters
        DROP CONSTRAINT IF EXISTS urban_parameters_job_id_key;
    `.execute(db);
}
