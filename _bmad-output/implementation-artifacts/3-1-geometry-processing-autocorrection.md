# Story 3.1: geometry-processing-autocorrection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to implement the core geometry processing in the worker,
So that we can handle spatial calculations robustly from ingested OSM data.

## Acceptance Criteria

1. **Given** raw OSM data in the worker
2. **When** processed
3. **Then** invalid geometries are fixed (using `ST_MakeValid`)
4. **And** geometries are transformed to an Equal-Area projection (Albers) for accurate area calc
5. **And** processed geometries are stored in the `osm_data` table

## Tasks / Subtasks

- [x] Task 1: Geometry Autocorrection Logic (AC: 1, 2, 3)
  - [x] Implement query functions via Kysely using `sql` template tags to call PostGIS `ST_MakeValid` before insertion.
  - [x] Ensure any self-intersecting polygons or overlapping segments are caught and repaired.
- [x] Task 2: Projection Transformation (AC: 4)
  - [x] Use PostGIS `ST_Transform` to convert `EPSG:4326` geometries (from OSM) into an Equal-Area Albers projection suitable for area calculations.
- [x] Task 3: Database Storage (AC: 5)
  - [x] Store processed geometries safely in `osm_data`.
  - [x] Confirm Kysely schema properly maps geometry columns to appropriate generated types.

## Dev Notes

- **Architecture Details & Constraints:**
  - **Worker Process:** Because this computation blocks event loops, the processing MUST happen either strictly on PostGIS inside query logic or offloaded gracefully in the BullMQ worker (`worker/index.ts`). Do NOT run this on the Next.js frontend or generic API routes.
  - **Tooling:** Kysely is the sole DB query builder. You must strictly use `CamelCasePlugin` for DB operations. `snake_case` in DB vs `camelCase` in TS.
- **Previous Story Intelligence:**
  - Story 2.5 (`chore: apply code review fixes for caching and confidence analysis`) recently finalized caching mechanisms, Overpass rate limits, and Redis queuing. Ensure geometry processing integrates cleanly with existing job queue pipeline when data finishes fetching from Overpass.
- **Web Intelligence (Latest Technical Specifics):**
  - Check PostGIS documentation for `ST_MakeValid` usage, which works well inline with inserts.

### Project Structure Notes

- Database definitions reside in `src/db/` (specifically `types.ts`, `index.ts`, `migrations/`). Ensure migrations exist for `osm_data` geometry columns if not added in Epic 2.
- Worker logic lives in `worker/index.ts`.

### References

- [Epic & Story Breakdown](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/planning-artifacts/epics.md#Epic-3:-Urban-Density-Metrics-&-Visualization)
- [Architecture Details](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/planning-artifacts/architecture.md)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- ✅ **Database Migration**: Created `002_create_osm_data_table.ts` to instantiate the `osm_data` table containing `geom` column using `geometry(Geometry, 5070)` for Albers Equal-Area projection. Types were securely generated in `src/db/types.ts`.
- ✅ **Geometry Processing**: Implemented `processAndInsertGeometry` allowing batched `osm_data` persistence. Translates inputs with `ST_MakeValid` and `ST_Transform(..., 5070)` accurately via Kysely raw SQL template strings.
- ✅ **Worker Integration**: Integrated geometry parsing safely into `worker/index.ts`. Generates standard WKT for nodes and ways natively and persists them transactionally.
- ✅ **Testing Implementation**: Added regression and integration testing coverage in `tests/geometry.test.ts` specifically targeting automated PostGIS geometry correction mechanisms (`ST_IsValid` validation).

### Code Review Fixes Applied (AI)

- **Relations Support**: `elementToWkt` securely parses MultiPolygon configurations from relations to prevent silent map feature loss.
- **LineString WKT Failure Risk**: WKT generation dynamically verifies point lengths (>= 2) shielding from invalid geometry SQL failures.
- **Overpass Fetching Safety**: Worker query handling automatically rewrites statements injecting `out geom;` shielding from undefined element coordinates.
- **Test Validation**: Exported WKT builder logic inside `src/lib/geometry.ts` and successfully verified against boundary corruptions and empty representations with node:test assertions.
- **Type Safety**: `types.ts` `osmId` supports `string | number` properly securing against JS Postgres `bigint` precision bounds.

### File List

- src/db/migrations/002_create_osm_data_table.ts
- src/db/types.ts
- src/lib/geometry.ts
- worker/index.ts
- tests/geometry.test.ts
- docker-compose.yml
- _bmad-output/implementation-artifacts/sprint-status.yaml
