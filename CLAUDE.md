# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Next.js dev server (port 3002)
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
- `REDIS_URL` — defaults to `redis://127.0.0.1:6379` if unset

**Docker** (optional local stack): `docker-compose up -d` starts PostgreSQL 16 + PostGIS on port **5433** and Redis 7 on port **6380** with persistent volumes. Credentials: `urbanize_user` / `urbanize_pass` / db `urbanize`.

## Architecture

### Request / Job Flow

1. User draws a circle on the map → `BaseMap` POSTs to `POST /api/analyze` with `{ lat, lon, radiusKm, year? }`
2. API generates an Overpass QL query (buildings, highways, amenities, shops, leisure, landuse, bus stops, taxi) and enqueues a BullMQ job on `data-fetch-queue`
3. `BaseMap` polls `GET /api/analyze/[jobId]` every 2 s
4. The **worker** (`worker/index.ts`) processes jobs: fetches from Overpass API → inserts geometries into PostGIS → calculates building & road density → writes results to `urban_parameters`
5. On completion, `BaseMap` fetches `/geometries` and `/extended-metrics` in parallel, then renders layers + full metrics panel

**Time Travel mode** dispatches two jobs (yearA past, yearB present) via Overpass Attic (`[date:"YYYY-01-01T00:00:00Z"]`). `TimelineSelector` also calls `GET /api/data-availability` to colour-code year availability. On completion, `BaseMap` fetches `/api/analyze/diff` and year-filtered geometries for both jobs, renders a split-screen map and `ComparisonCard`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Enqueue analysis job; returns `{ jobId }` |
| `GET` | `/api/analyze/[jobId]` | Job state + basic metrics from `urban_parameters` |
| `GET` | `/api/analyze/[jobId]/geometries?year=` | GeoJSON of stored features (optional year filter) |
| `GET` | `/api/analyze/[jobId]/extended-metrics` | Full 20+ parameter set (see below) |
| `GET` | `/api/analyze/diff?jobAId=&jobBId=` | Delta metrics for Time Travel comparison |
| `GET` | `/api/export/csv?jobAId=&jobBId=` | CSV download with citation header |
| `GET` | `/api/data-availability?lat=&lon=&radiusKm=` | Year availability for timeline UI |

### Extended Metrics (`src/lib/extended-metrics.ts`)

`GET /api/analyze/[jobId]/extended-metrics` returns `ExtendedMetrics`:

**Buildings**: `buildingCount`, `buildingCoveragePct`, `avgBuildingLevels`, `avgBuildingHeightM`, `buildingFootprintM2`

**Roads**: `totalRoadLengthKm`, `tarredRoadLengthKm`, `untarredRoadLengthKm`, `sidewalkLengthKm`, `roadIntersectionCount`

**Land uses** (each is a `ProximityMetrics` object with `count`, `nearestKm`, `farthestKm`, `avgKm`, `totalKm`, `areaMsq`):
`busStops`, `taxiStations`, `lorryStations`, `markets`, `schools`, `universities`, `hospitals`, `clinics`, `pharmacies`, `banks`, `fuelStations`, `restaurants`, `shops`, `worship`, `police`, `parks`

Road intersections use `ST_Node` topology; proximity distances use `::geography` cast for ellipsoidal accuracy (correct globally, not just EPSG:5070's US coverage).

### Key Directories

- `src/app/api/` — Route Handlers (server-only)
- `src/app/(dashboard)/map/` — Main map page
- `src/app/(auth)/` — Clerk sign-in/sign-up pages
- `src/features/map/components/` — All map UI: `BaseMap` (orchestrator), `CircleDrawer`, `CitySearch`, `DrawControl`, `AnalysisLayers` (buildings + roads + POI markers), `MetricsPanel` (full scrollable metrics), `LayerToggle`, `TimelineSelector`, `SplitScreenMap`, `ComparisonCard`
- `src/lib/` — `queue.ts`, `redis.ts`, `job-schema.ts`, `geometry.ts`, `density.ts`, `extended-metrics.ts`
- `src/db/` — Kysely singleton, type definitions, migration runner, migrations
- `worker/index.ts` — BullMQ Worker; rate-limited to 1 job / 2 s; Overpass responses cached in Redis 24 h (cache key = SHA256 of query). On a cache hit the Overpass fetch is skipped but density calculations still run to persist `urban_parameters`. Invalid payloads throw `UnrecoverableError` (no retry); 429s throw standard `Error` (retried with exponential backoff, 3 attempts).
- `tests/` — Node.js built-in test runner (`tsx --test`)

### Database

PostgreSQL + PostGIS. All geometries stored in **EPSG:5070** (US Albers Equal Area). For distance/length calculations, always cast to `::geography` to get ellipsoidal accuracy:
```sql
ST_Length(geom::geography)  -- correct globally
ST_Distance(a.geom::geography, b.geom::geography)
```

Tables:
- `osm_data` — `osm_id` bigint, `osm_type` varchar(20), `tags` jsonb, `geom` geometry(Geometry,5070), `fetched_for_year` integer
- `urban_parameters` — `job_id`, `lat`, `lon`, `radius_km`, `building_density_pct`, `road_density`; unique on `job_id`

**Kysely** with `CamelCasePlugin` — TypeScript uses camelCase, raw SQL uses snake_case column names. Never import `src/db/index.ts` from Client Components.

**Raw SQL alias caveat**: `CamelCasePlugin` transforms `.as('camelCase')` aliases into snake_case. In `sql` template literals, use all-lowercase single-word aliases (e.g. `sql\`... as count\``) to avoid transformation mismatches.

### Auth

Clerk middleware protects all routes except `(auth)` pages. Dashboard at `/map`.

### UI Components

`src/components/ui/` — shadcn/ui primitives. Feature components in `src/features/map/components/` only.

## Known Blockers & Non-Achievable Parameters

These parameters were requested but **cannot be sourced from OpenStreetMap**:

| Parameter | Blocker | Would require |
|---|---|---|
| Peak-hour traffic volume | OSM has no traffic counts | Google Roads API, HERE Traffic, TomTom |
| 24-hr average daily traffic (ADT) | OSM has no traffic counts | Same |
| Average / 85th percentile speed | No speed data in OSM | Google Maps Platform, traffic sensors |
| Level of Service (LOS) | No volume/capacity data | Same |
| Population / household count | Not in OSM | WorldPop, Ghana Statistical Service census |
| Land / property values | Not in OSM | Ghana Lands Commission |
| Electricity grid coverage | Sparse in OSM for Ghana | ECG (Electricity Company of Ghana) |
| Water / drainage networks | Not mapped in Ghana OSM | GWCL, municipal authorities |

**OSM data quality notes for Ghana**:
- Road `surface` tags sparsely applied → tarred/untarred split will undercount
- `building:levels` / `building:height` rarely set → those metrics will be null for most analyses
- Overpass Attic reliable from ~2013 for Ghana; pre-2013 Time Travel queries return sparse data
- Good OSM coverage: Accra, Kumasi main roads and amenities. Patchy: residential buildings, smaller towns
