import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types';

/**
 * Kysely database singleton.
 * Server-only — import ONLY in Server Components, Server Actions, or Route Handlers.
 * DATABASE_URL is guaranteed available in Next.js runtime.
 */
const dialect = new PostgresDialect({
    pool: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
});

export const db = new Kysely<Database>({
    dialect,
    plugins: [new CamelCasePlugin()],
});
