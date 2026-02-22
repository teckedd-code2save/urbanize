# Story 1.2: Database & ORM Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to set up PostgreSQL 16 with PostGIS and configure Kysely,
so that we can store and query geospatial data type-safely.

## Acceptance Criteria

1. **Given** Docker is installed
   **When** I run `docker-compose up -d`
   **Then** a PostgreSQL 16 container with PostGIS extension enabled is running on port 5432

2. **And** an `.env.local` file (with `.env.example` committed) contains `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`

3. **And** a Kysely instance is configured in `src/db/index.ts` with `CamelCasePlugin` and typed against a `Database` interface in `src/db/types.ts`

4. **And** a migration script infrastructure is in place (`src/db/migrations/`) with at least one initial migration that enables the PostGIS extension

5. **And** a test script (`npm run db:test`) or documented curl/psql command successfully executes a Kysely query against the live database (e.g., a simple `SELECT 1` or `SELECT PostGIS_Version()`) and logs the result without errors

## Tasks / Subtasks

- [x] Create `docker-compose.yml` (AC: 1)
  - [x] Define `db` service using `postgis/postgis:16-3.4` image
  - [x] Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` via env vars
  - [x] Map port `5432:5432`
  - [x] Add a named volume `urbanize_db_data` for persistence
  - [x] Add `healthcheck` on `pg_isready`
- [x] Set up environment variable files (AC: 2)
  - [x] Create `.env.example` with placeholder values for all DB vars + `DATABASE_URL`
  - [x] Create `.env.local` (gitignored) with real local dev values
  - [x] Confirm `.env.local` is in `.gitignore` (covered by `.env*` pattern + `!.env.example` negation added)
- [x] Install Kysely + pg adapter (AC: 3)
  - [x] `npm install kysely pg dotenv`
  - [x] `npm install --save-dev @types/pg tsx`
- [x] Create database module at `src/db/index.ts` (AC: 3)
  - [x] Import `Kysely`, `PostgresDialect`, `CamelCasePlugin` from `kysely`
  - [x] Import `Pool` from `pg`
  - [x] Create `Pool` using `process.env.DATABASE_URL`
  - [x] Export `db` instance: `new Kysely<Database>({ dialect, plugins: [new CamelCasePlugin()] })`
- [x] Define initial DB types at `src/db/types.ts` (AC: 3)
  - [x] Create `Database` interface (initially empty, ready for future table additions)
  - [x] Export `DB = Database` as the canonical shorthand
- [x] Set up migration infrastructure (AC: 4)
  - [x] Create `src/db/migrations/` directory
  - [x] Create `001_enable_postgis.ts` using `sql` template tag: `sql\`CREATE EXTENSION IF NOT EXISTS postgis\`.execute(db)`
  - [x] Add `npm run db:migrate` script in `package.json` using `tsx src/db/migrate.ts`
  - [x] Implement `src/db/migrate.ts` using Kysely's `Migrator` with `FileMigrationProvider`
- [x] Verify connectivity (AC: 5)
  - [x] Run the migration: `npm run db:migrate` — ✅ "001_enable_postgis ran successfully"
  - [x] Execute connectivity test: `docker exec urbanize-db-1 psql -U urbanize_user -d urbanize -c "SELECT PostGIS_Version();"` — ✅ "3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1"
  - [x] Kysely migration tracking tables confirmed: `kysely_migration`, `kysely_migration_lock`

## Dev Notes

### Architecture Compliance — MANDATORY

- **Database:** PostgreSQL **16** (not 15, not 17). Use Docker image `postgis/postgis:16-3.4`.
- **ORM:** **Kysely only**. Do NOT use Prisma, Drizzle, or TypeORM.
- **Plugin:** `CamelCasePlugin` MUST be applied to the Kysely instance — this bridges DB `snake_case` columns to TypeScript `camelCase` automatically. Never manually convert column names.
- **Directory:** DB module MUST live at `src/db/`. Do NOT place it in `src/lib/` or `src/features/`.
- **Connection String:** Use a single `DATABASE_URL` env var (format: `postgresql://user:pass@localhost:5432/urbanize`) sourced via `process.env.DATABASE_URL`.
- **No PII retention:** DB must not store any personally identifiable information in this story beyond what Clerk provides.

### Technical Stack

| Concern | Technology | Version (latest stable as of 2026-02) |
|---|---|---|
| Database Image | `postgis/postgis` | `16-3.4` |
| Query Builder | `kysely` | `^0.28.11` |
| PG Client | `pg` | `^8.18.0` |
| PG Types | `@types/pg` | `^8.16.0` |
| Migrations | Kysely `Migrator` + `FileMigrationProvider` | (bundled with kysely) |
| Env Loading | `dotenv` | `^17.3.1` |
| Script Runner | `tsx` | `^4.21.0` |

> **Important:** `migrate.ts` loads dotenv BEFORE creating the Kysely instance to avoid ES module hoisting issues. The main `src/db/index.ts` relies on Next.js runtime to provide `DATABASE_URL`.

> **Note:** `postgis/postgis:16-3.4` image may show a platform warning on Apple Silicon (`linux/amd64` vs `linux/arm64/v8`). It works via Rosetta emulation — acceptable for local dev.

### Environment Variables

```
# .env.example (commit this)
DATABASE_URL=postgresql://urbanize_user:urbanize_pass@localhost:5432/urbanize
POSTGRES_USER=urbanize_user
POSTGRES_PASSWORD=urbanize_pass
POSTGRES_DB=urbanize
```

> ⚠️ Environment variable handling: In Next.js 13+ App Router, server-only env vars (no `NEXT_PUBLIC_` prefix) are only available in Server Components, Server Actions, and Route Handlers. The `src/db/index.ts` module is server-only — never import it from a Client Component.

### Code Patterns — Follow Exactly

**`src/db/index.ts`:**
```ts
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types';

const dialect = new PostgresDialect({
  pool: new Pool({ connectionString: process.env.DATABASE_URL }),
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
```

**`src/db/types.ts`:**
```ts
export interface Database {
  // Tables will be added here as migrations are applied.
}
export type DB = Database;
```

**Migration pattern (`src/db/migrations/001_enable_postgis.ts`):**
```ts
import { type Kysely, sql } from 'kysely';
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db);
}
export async function down(_db: Kysely<unknown>): Promise<void> {
  // intentional no-op — dropping PostGIS is destructive
}
```

### Project Structure Notes

**Files created in this story:**
```
urbanize/
├── docker-compose.yml           # [NEW] DB orchestration
├── .env.example                 # [NEW] Env variable template (committed)
├── .env.local                   # [NEW] Local dev values (gitignored)
├── .gitignore                   # [MODIFIED] Added !.env.example negation
├── package.json                 # [MODIFIED] Added db:migrate, db:test scripts
├── src/
│   └── db/
│       ├── index.ts             # [NEW] Kysely instance with CamelCasePlugin
│       ├── types.ts             # [NEW] Database type interface
│       ├── migrate.ts           # [NEW] Self-contained migration runner
│       └── migrations/
│           └── 001_enable_postgis.ts  # [NEW] Enables PostGIS extension
```

### Previous Story Intelligence (Story 1.1)

- All source code in `src/` — follows convention.
- TypeScript-only (`*.ts`) — all new files are `.ts`.
- Existing `src/` only had `src/app/` and `src/lib/` — `src/db/` is new.

### References

- [Architecture: Data Architecture](/_bmad-output/planning-artifacts/architecture.md#data-architecture)
- [Architecture: Project Directory Structure](/_bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure)
- [Architecture: Naming Patterns](/_bmad-output/planning-artifacts/architecture.md#naming-patterns)
- [Epic 1: Story 1.2](/_bmad-output/planning-artifacts/epics.md#story-12-database--orm-configuration)
- [Kysely Docs: Migrations](https://kysely.dev/docs/migrations)
- [PostGIS Docker Image](https://hub.docker.com/r/postgis/postgis)

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

- ES module hoisting issue: `tsx` hoists all `import` statements before executing top-level code, so `dotenv.config()` at the top of migrate.ts ran AFTER `db` was already imported and the `Pool` created. Fixed by making `migrate.ts` self-contained (creates its own Kysely instance inline after dotenv config).
- Kysely raw SQL API: `db.schema.raw()` does not exist. Correct API is `sql\`...\`.execute(db)` using the `sql` template tag exported from `kysely`.
- Platform warning: `postgis/postgis:16-3.4` is amd64. Runs fine via Rosetta emulation on macOS Apple Silicon for local dev.

### Completion Notes List

- ✅ Created `docker-compose.yml` with `postgis/postgis:16-3.4`, named volume `urbanize_db_data`, healthcheck via `pg_isready`.
- ✅ Created `.env.example` (tracked in git) and `.env.local` (gitignored). Updated `.gitignore` with `!.env.example` negation.
- ✅ Installed `kysely@0.28.11`, `pg@8.18.0`, `dotenv@17.3.1` (dependencies) and `@types/pg@8.16.0`, `tsx@4.21.0` (devDependencies).
- ✅ Created `src/db/index.ts` with `Kysely<Database>` + `CamelCasePlugin` + `PostgresDialect` (Pool-based).
- ✅ Created `src/db/types.ts` with empty `Database` interface and `DB` type alias.
- ✅ Created `src/db/migrate.ts` as self-contained migration runner (loads dotenv inline before creating db instance).
- ✅ Created `src/db/migrations/001_enable_postgis.ts` using `sql` template tag with proper `up`/`down` exports.
- ✅ Added `db:migrate` and `db:test` scripts to `package.json`.
- ✅ Migration `001_enable_postgis` ran successfully: PostGIS extension enabled.
- ✅ Verified: `SELECT PostGIS_Version()` → `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`.
- ✅ Resolved review finding [High]: Added `DATABASE_URL` null guard to `src/db/index.ts` — throws descriptive error on missing env var.
- ✅ Resolved review finding [High]: Replaced inline `db:test` one-liner with `src/db/test-connection.ts` — properly loads dotenv, uses public `sql` template API, verified live: PostGIS 3.4 ✅.
- ✅ Resolved review finding [Medium]: Removed deprecated `version: '3.8'` key from `docker-compose.yml`.
- ✅ Resolved review finding [Medium]: Updated `migrate.ts` dotenv path to use `path.resolve(process.cwd(), '.env.local')` for CWD-safe resolution.
- ✅ Resolved review finding [Medium]: Replaced `db.executeQuery()` (internal API) with `sql` template tag in `test-connection.ts`.
- ✅ Resolved review finding [Low]: Removed `console.log` side-effects from `001_enable_postgis.ts` migration functions.

### File List

- `docker-compose.yml` *(new)*
- `.env.example` *(new)*
- `.env.local` *(new — gitignored)*
- `.gitignore` *(modified — added `!.env.example`)*
- `package.json` *(modified — added `db:migrate`, `db:test` scripts + dependencies)*
- `package-lock.json` *(modified — dependency updates)*
- `src/db/index.ts` *(new)*
- `src/db/types.ts` *(new)*
- `src/db/migrate.ts` *(new)*
- `src/db/test-connection.ts` *(new — added post-review)*
- `src/db/migrations/001_enable_postgis.ts` *(new)*

### Change Log

- (2026-02-19) Implemented Story 1.2: PostgreSQL 16 + PostGIS docker-compose, Kysely ORM with CamelCasePlugin, migration infrastructure, connectivity verified.
- (2026-02-20) Code review fixes applied: DATABASE_URL null guard, CWD-safe dotenv path in migrate.ts, deprecated docker-compose version key removed, test-connection.ts created with proper public API, migration console.logs removed. All verified: `npm run db:test` → PostGIS 3.4 ✅.
