# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Next.js dev server (port 3000)
pnpm build          # Production build
pnpm lint           # ESLint
pnpm db:migrate     # Run pending Kysely migrations
pnpm db:test        # Test database connection
pnpm worker         # Start BullMQ worker (separate process, requires Redis)
pnpm test           # Run all tests (Node.js built-in test runner)
```

Run a single test file:
```bash
tsx --env-file=.env.local --test tests/timeline.test.ts
```

The worker **must** run as a separate process alongside `pnpm dev`. It is not part of Next.js.

## Environment Setup

Copy `.env.example` to `.env.local`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string (PostGIS extension must be enabled)
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox GL access token
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk auth
- Redis is implicitly required (default `localhost:6379`) by both the worker and the BullMQ queue in Next.js

## Architecture

### Request / Job Flow

1. User draws a circle on the map → `BaseMap` POSTs to `POST /api/analyze` with `{ lat, lon, radiusKm, year? }`
2. The API generates an Overpass QL query and enqueues a BullMQ job on `data-fetch-queue`
3. `BaseMap` polls `GET /api/analyze/[jobId]` every 2 s
4. The **worker** (`worker/index.ts`) processes jobs: fetches from Overpass API → inserts geometries into PostGIS → calculates building & road density → writes results to `urban_parameters`
5. On completion, `BaseMap` fetches `GET /api/analyze/[jobId]/geometries` and renders them as map layers

**Time Travel mode** dispatches two jobs (yearA past, yearB present) via Overpass Attic (`[date:"YYYY-01-01T00:00:00Z"]`). The `TimelineSelector` component also calls `GET /api/data-availability?lat=&lon=&radiusKm=` to colour-code year availability based on existing DB data.

### Key Directories

- `src/app/api/` — Route Handlers (server-only); `analyze/`, `analyze/[jobId]/`, `analyze/[jobId]/geometries/`, `data-availability/`
- `src/app/(dashboard)/map/` — Main map page
- `src/app/(auth)/` — Clerk sign-in/sign-up pages
- `src/features/map/components/` — All map UI: `BaseMap` (orchestrator), `CircleDrawer`, `CitySearch`, `DrawControl`, `AnalysisLayers`, `ResultsCard`, `LayerToggle`, `TimelineSelector`
- `src/lib/` — Shared utilities: `queue.ts` (BullMQ Queue singleton), `redis.ts`, `job-schema.ts` (Zod schemas + queue name), `geometry.ts` (WKT conversion + DB insert), `density.ts` (PostGIS building/road density queries)
- `src/db/` — Kysely singleton (`index.ts`), type definitions (`types.ts`), migration runner (`migrate.ts`), migrations in `migrations/`
- `worker/index.ts` — BullMQ Worker; rate-limited to 1 job / 2 s; caches Overpass responses in Redis for 24 h
- `tests/` — Node.js built-in test runner; all tests require `.env.local`

### Database

PostgreSQL + PostGIS. All geometries are stored in **EPSG:5070** (US Albers Equal Area) via `ST_Transform` at insert time. Spatial queries use `ST_Buffer` + `ST_Intersection` / `ST_Length` in the same projection for accurate area/length computation.

Tables:
- `osm_data` — raw OSM geometries with `tags` (JSONB), `geom` (PostGIS), `fetched_for_year`
- `urban_parameters` — computed metrics per job: `building_density_pct`, `road_density` (km/km²), unique on `job_id`

**Kysely** is the query builder. The `CamelCasePlugin` is always active — TypeScript uses camelCase (`osmData`, `fetchedForYear`) while the DB uses snake_case. Never import `src/db/index.ts` from Client Components; it throws at module load time if `DATABASE_URL` is unset.

Migrations live in `src/db/migrations/` as numbered TypeScript files. Add new tables there and update `src/db/types.ts`.

### Auth

Clerk middleware (`src/middleware.ts`) protects all routes except `(auth)` pages. The dashboard is at `/map`.

### UI Components

`src/components/ui/` contains shadcn/ui primitives (Button, Card, Dialog, etc.). Feature-specific components live in `src/features/map/components/` and should not be moved to `src/components/`.
