import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types';

/**
 * Kysely database singleton.
 * Server-only — import ONLY in Server Components, Server Actions, or Route Handlers.
 * DATABASE_URL must be set in the Next.js server runtime environment.
 */
if (!process.env.DATABASE_URL) {
    throw new Error(
        '[db] DATABASE_URL is not set. ' +
        'This module is server-only — never import it from Client Components. ' +
        'Ensure DATABASE_URL is defined in .env.local for local dev.'
    );
}

const dialect = new PostgresDialect({
    pool: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
});

export const db = new Kysely<Database>({
    dialect,
    plugins: [new CamelCasePlugin()],
});
