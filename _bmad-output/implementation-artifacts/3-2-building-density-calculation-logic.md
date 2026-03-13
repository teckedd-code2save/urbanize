# Story 3.2: building-density-calculation-logic

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want to calculate the Building Density metric,
So that users get the primary density value.

## Acceptance Criteria

1. **Given** a study area (circle)
2. **When** triggered
3. **Then** the worker calculates: `Sum(Building Footprint Area) / Circle Area`
4. **And** the result is stored as a percentage (0-100%)
5. **And** the calculation handles edge cases (e.g., buildings partially outside circle)

## Tasks / Subtasks

- [x] Task 1: Building Area Calculation Logic (AC: 1, 2, 3)
  - [x] Implement query function using Kysely to sum the `ST_Area(ST_Intersection(geom, circle))` for buildings within the requested area.
  - [x] Ensure geometries are evaluated in Equal-Area projection (EPSG:5070 Albers) for accurate square meter calculations.
- [x] Task 2: Percentage Conversion and Edge Cases (AC: 4, 5)
  - [x] Divide the total building footprint intersection area by the total circle area.
  - [x] Convert result to a percentage value (0-100%).
  - [x] Ensure geometries partially outside the circle only contribute their intersected enclosed area (handled by `ST_Intersection`).
- [x] Task 3: Database Storage and Worker Integration
  - [x] Save the calculated density value into the `urban_parameters` table. (Ensure migration exists).
  - [x] Integrate into BullMQ worker (`worker/index.ts` or specific worker service feature).
  - [x] Add rigorous node tests in `tests/` to verify calculations against known bounding boxes/polygons.

## Dev Notes

### Architecture & Requirements Guardrails:
- **Performance Constraint**: Complex geospatial math MUST be handled by the Database Layer (PostGIS) via Kysely SQL tags inside the BullMQ worker, NOT the Node.js event loop.
- **Database/ORM**: Use Kysely with `CamelCasePlugin` to auto-translate between `snake_case` DB schemas (`urban_parameters`) and `camelCase` TS application logic.
- **Geometric Precision**: `osm_data` already stores geometries in an Equal-Area projection (`geometry(Geometry, 5070)`). Ensure the input circle for intersection is also created and projected correctly (e.g. `ST_Transform(ST_Buffer(...), 5070)`) before calculating intersections to guarantee area accuracy.
- **Validation**: Schema validation via Zod is mandatory.
- **Error Handling**: Worker routines should log safely or bubble up failures without crashing the queue. 

### Previous Story Intelligence (`3-1-geometry-processing-autocorrection`):
- Worker already has integrated functions storing data securely to `osm_data` natively utilizing EPSG:5070.
- Raw SQL templates using Kysely's `sql` tag is the established pattern for invoking deep PostGIS functions.
- The `tests/geometry.test.ts` uses native `node:test` assertions. Follow this established testing idiom for density logic validation.

### Project Structure Notes
- **Database definition**: Resides in `src/db/` (`index.ts`, `types.ts`, `migrations/`). 
- **Worker Environment**: `worker/index.ts`. All processor logic must execute here.
- Add shared geometry utilities to `src/lib/geometry.ts` if relevant to client fetching.

### References
- [Epic Breakdowns: Epic 3 - Urban Density Metrics](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/planning-artifacts/epics.md#Epic-3:-Urban-Density-Metrics-&-Visualization)
- [Architecture Details](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/planning-artifacts/architecture.md)
- [Geometry Foundations](file:///Users/welcome/Documents/SoftwareEngineering/serendepify/urbanize/_bmad-output/implementation-artifacts/3-1-geometry-processing-autocorrection.md)

## Dev Agent Record

### Agent Model Used

Antigravity 

### Debug Log References

Tests completed in `f73c10ea-95bb-4661-8883-8a02d1fdf04a`. All regression suites passed successfully.

### Completion Notes List

- ✅ Processed `003_create_urban_parameters_table.ts` and successfully updated Kysely typings inside `src/db/types.ts`.
- ✅ Implemented `calculateBuildingDensity` directly tying geospatial math securely inside Kysely raw SQL template strings resolving projection bounds natively.
- ✅ Successfully handled 4326->5070 coordinate reprojection internally enforcing area precision mapping intersection calculations safely inside PostgreSQL.
- ✅ Bound post-processing directly to BullMQ event results via `worker/index.ts` without blocking the generic event cycle loop.
- ✅ Added node-test driven unit test assertions over synthetic bound box testing validating accuracy explicitly inside `tests/density.test.ts`.

### File List

- src/db/migrations/003_create_urban_parameters_table.ts
- src/db/migrations/004_add_unique_job_id_urban_parameters.ts
- src/db/types.ts
- src/lib/density.ts
- worker/index.ts
- tests/density.test.ts
- docker-compose.yml

## Senior Developer Review (AI)

**Date:** 2026-03-04 | **Reviewer:** Antigravity

**Outcome:** Changes Requested → Fixed Automatically

**Issues Found & Fixed:**
- 🔴 **C1 [FIXED]** SQL injection via string concatenation in `density.ts` → replaced with `ST_MakePoint(lon, lat)` which is naturally parameterized via `sql.val()`
- 🟡 **H1 [FIXED]** Circle area computed in Node.js (Euclidean) → now computed by PostGIS (`ST_Area(ST_Buffer(...))`) in same query for EPSG:5070 accuracy
- 🟡 **H2 [FIXED]** Density error was silently swallowed in `worker/index.ts` → now propagates via `throw` to fail the BullMQ job correctly
- 🟡 **H3 [FIXED]** `radiusKm` was back-computed from bbox rectangle area → now derived as `Math.hypot(heightKm/2, widthKm/2)` (half-diagonal circumradius)
- 🟠 **M1 [FIXED]** Test assertions too weak (`> 0 && <= 100`) → now asserts within `±4%` of expected `~9.8%` density; added 2 additional test cases
- 🟠 **M2 [FIXED]** Cached job path never called `calculateBuildingDensity` → density calculation now runs in both cached and live paths
- 🟠 **M3 [FIXED]** `docker-compose.yml` modified but not in File List → added to File List
- 🟢 **L1 [FIXED]** Missing Zod validation → added `calculateDensityParamsSchema` guard at function entry
- 🟢 **L2 [FIXED]** No `onConflict` on insert → added `UNIQUE(job_id)` to migration + migration 004 for existing DBs + upsert in density.ts
