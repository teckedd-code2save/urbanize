/**
 * Database connectivity test.
 * Run via: npm run db:test
 *
 * Verifies the DATABASE_URL connection and PostGIS availability.
 * Self-contained: loads .env.local before creating the db instance.
 */
import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { CamelCasePlugin, Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ DATABASE_URL is not set. Check .env.local exists and contains DATABASE_URL.');
    process.exit(1);
}

const db = new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }),
    plugins: [new CamelCasePlugin()],
});

async function testConnection() {
    try {
        const result = await sql<{ version: string }>`SELECT PostGIS_Version() AS version`.execute(db);
        console.log('✅ Database connection successful.');
        console.log('✅ PostGIS version:', result.rows[0]?.version);
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

testConnection();
