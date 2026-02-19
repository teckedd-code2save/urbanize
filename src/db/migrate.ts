/**
 * Database migration runner.
 * Run via: npm run db:migrate
 *
 * This script is self-contained and creates its own db instance AFTER
 * loading env vars to avoid ES module hoisting issues.
 */
import { config } from 'dotenv';
// Load env vars BEFORE creating the db connection
config({ path: '.env.local' });

import * as path from 'path';
import * as fs from 'fs/promises';
import { CamelCasePlugin, FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

async function migrateToLatest() {
    // Create a fresh db connection here (isolated from src/db/index.ts)
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set. Check .env.local exists and contains DATABASE_URL.');
        process.exit(1);
    }

    const db = new Kysely<Record<string, never>>({
        dialect: new PostgresDialect({
            pool: new Pool({ connectionString }),
        }),
        plugins: [new CamelCasePlugin()],
    });

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.join(path.dirname(new URL(import.meta.url).pathname), 'migrations'),
        }),
    });

    const { error, results } = await migrator.migrateToLatest();

    results?.forEach((it) => {
        if (it.status === 'Success') {
            console.log(`✅ Migration "${it.migrationName}" ran successfully.`);
        } else if (it.status === 'Error') {
            console.error(`❌ Failed to run migration "${it.migrationName}".`);
        }
    });

    if (error) {
        console.error('Failed to migrate:', error);
        await db.destroy();
        process.exit(1);
    }

    console.log('✅ All migrations completed.');
    await db.destroy();
}

migrateToLatest();
