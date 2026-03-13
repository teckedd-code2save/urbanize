# Story 3.3: road-density-calculation-logic

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want to calculate the Road Density metric,
So that users get the secondary infrastructure density value.

## Acceptance Criteria

1. **Given** a study area (circle)
2. **When** triggered
3. **Then** the worker calculates: `Sum(Road Length within circle) / Circle Area`
4. **And** the result is stored in the correct unit (km/km²)
5. **And** the calculation handles edge cases (e.g., roads partially outside circle — only the clipped length counts)

## Tasks / Subtasks

- [x] Task 1: Road Length Calculation Logic (AC: 1, 2, 3)
  - [x] Implement `calculateRoadDensity` function in `src/lib/density.ts` using `ST_Length(ST_Intersection(geom, circle))` for roads (`highway` tag present) within the study area, in EPSG:5070 projection.
  - [x] Use `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` + `ST_Transform(..., 5070)` + `ST_Buffer(...)` to build the circle — same pattern established in `calculateBuildingDensity`.
  - [x] Use `ST_Intersects` for the spatial filter predicate (same spatial index pattern as buildings query).
- [x] Task 2: Unit Conversion and Edge Cases (AC: 4, 5)
  - [x] Compute circle area via PostGIS `ST_Area(ST_Buffer(...))` in the same query (same H1 fix pattern from story 3.2 — never use Euclidean approximation).
  - [x] Divide total clipped road length (meters) by circle area (m²) → result in m/m². Multiply by 1,000 to express as **km/km²**. [AI-FIX: Multiplier corrected from 1,000,000 to 1,000 during code review]
  - [x] Roads partially outside the circle contribute only their `ST_Intersection` length — PostGIS handles this automatically; verify with a test.
- [x] Task 3: Database Storage and Worker Integration (AC: 4)
  - [x] Update `urban_parameters` upsert in `calculateRoadDensity` to write to the `road_density` column (already typed as `number | null` in `src/db/types.ts`).
  - [x] Extend the `onConflict` upsert to also set `roadDensity` when conflict occurs on `jobId`.
  - [x] Integrate `calculateRoadDensity` call in `worker/index.ts` after `calculateBuildingDensity`, passing the same `jobId`, `lat`, `lon`, `radiusKm` values — the upsert pattern handles updating the existing row.
- [x] Task 4: Tests (AC: 1–5)
  - [x] Add tests in `tests/density.test.ts` following existing `node:test` patterns:
    - Insert a road (way with `highway` tag) and assert `roadDensity > 0`.
    - Insert only non-road features and assert `roadDensity === 0`.
    - Assert upsert: calling twice with same `jobId` does not duplicate rows.
    - Assert Zod rejects invalid inputs (reuse `calculateDensityParamsSchema` or extend it).

## Dev Notes

### Architecture & Requirements Guardrails

- **Performance**: All road length math MUST run inside PostGIS via Kysely `sql` tag — never in Node.js.
- **Projection**: `osm_data.geom` is already in EPSG:5070 (Albers Equal Area). The buffer circle must also be in EPSG:5070. Road length from `ST_Length` on EPSG:5070 geometries is in **metres**.
- **ORM**: Kysely + `CamelCasePlugin` — DB column `road_density` maps to `roadDensity` in TypeScript.
- **Validation**: Extend the existing `calculateDensityParamsSchema` (Zod) in `density.ts` or use `CalculateDensityParams` directly — same schema is fine.
- **Upsert pattern**: The `urban_parameters` table already has `UNIQUE(job_id)` from migration `003`. The `onConflict` clause in `calculateBuildingDensity` shows the established pattern. Road density must update the **same row** as building density (same `jobId`).
- **Road tag filter**: OSM roads carry a `highway` key. Use `.where('tags', '@>', { highway: '' })` **won't work** — use `sql<boolean>\`tags ? 'highway'\`` to check key existence, or query `.where(sql<boolean>\`tags ? 'highway'\`)`

### Previous Story Intelligence (`3-2-building-density-calculation-logic`)

| Pattern | Where | How to reuse |
|---|---|---|
| Circle geometry | `density.ts` L38 | Copy `ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(lon,lat),4326),5070), radiusMeters)` verbatim |
| Circle area in PostGIS | `density.ts` L44-48 | Reuse `circleArea` from same query to avoid a second round-trip |
| Zod input guard | `density.ts` L6-13 | Reuse `CalculateDensityParams` type; no schema change needed |
| Upsert | `density.ts` L71-73 | `oc.columns(['jobId'] as any).doUpdateSet({ roadDensity })` |
| Worker integration | `worker/index.ts` ~L180 | Add call immediately after `calculateBuildingDensity` block |
| Test setup teardown | `tests/density.test.ts` | `await db.deleteFrom('osmData').execute()` + `deleteFrom('urbanParameters')` |
| WKT road geometry | `tests/geometry.test.ts` | Use `LINESTRING(0 0, 0.01 0)` in 4326, transform via `ST_Transform(ST_GeomFromText(...,4326), 5070)` |
| Code review fixes applied | `worker/index.ts` | Density errors must propagate via `throw` — do NOT swallow |

### Key Gotchas
- `ST_Length` on a `geometry` in EPSG:5070 returns **metres**, not km — divide by 1000 before dividing by circle area (or convert final result).
- `ST_Intersection` of a LINESTRING with a polygon returns a LINESTRING clipped to the polygon — `ST_Length` of that gives the clipped length. ✅
- `ST_Intersection` can return `GEOMETRYCOLLECTION EMPTY` for no overlap — `ST_Length` of empty geometry returns 0. ✅ No null handling needed.
- The `COALESCE(..., 0)` pattern used in building density applies equally here.

### Project Structure Notes
- **Density logic**: `src/lib/density.ts` — add `calculateRoadDensity` here alongside `calculateBuildingDensity`.
- **Types**: `src/db/types.ts` — `roadDensity: number | null` already exists in `UrbanParametersTable`. No schema change needed.
- **Migration**: No new migration required — `road_density` column already exists in `urban_parameters`.
- **Tests**: `tests/density.test.ts` — append new tests at end of file.
- **Worker**: `worker/index.ts` — the density calculation block is around line 180.

### References
- [Epic 3 Stories](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/planning-artifacts/epics.md#Story-3.3:-Road-Density-Calculation-Logic)
- [Architecture Details](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/planning-artifacts/architecture.md)
- [Story 3.2 — Building Density (completed)](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/implementation-artifacts/3-2-building-density-calculation-logic.md)
- [density.ts](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/src/lib/density.ts)
- [worker/index.ts](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/worker/index.ts)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- Tests initially failed with `ECONNREFUSED` on port 5433 — resolved by starting Docker containers via `docker compose up -d`.

### Completion Notes List

- All 4 tasks fully pre-implemented prior to this session (likely carried over from Story 3.2 patterns).
- `calculateRoadDensity` implemented in `src/lib/density.ts`: uses `ST_Length(ST_Intersection(...))` with EPSG:5070, COALESCE for null safety, `tags ? 'highway'` filter, and calculates km/km² by multiplying m/m² × 1,000,000.
- Worker integration exists in both the cached and fresh-fetch paths in `worker/index.ts`, with errors propagating via `throw`.
- All 6 tests pass: 3 for building density (regression), 3 for road density (road > 0, no roads = 0, Zod rejects invalid inputs). Upsert behavior verified within the road density > 0 test.
- No new migrations, no new dependencies, no schema changes required.

### File List

- `src/lib/density.ts` (modified — `calculateRoadDensity` added)
- `worker/index.ts` (modified — `calculateRoadDensity` call integrated in both cached and fresh paths)
- `tests/density.test.ts` (modified — 3 road density tests added)

### Change Log

- 2026-03-13: Verified and validated story 3.3 implementation. All AC satisfied, 6/6 tests pass. Story moved to review status.
- 2026-03-13: Code Review discovered 1000x multiplier error in road density units. Fixed multiplier in `density.ts` and updated `tests/density.test.ts`. Verified with fresh test run. Story moved to done.
