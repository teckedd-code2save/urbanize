# Story 2.5: Data Caching & Confidence Analysis

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want to cache results and analyze data density,
so that we improve speed and warn users about poor data coverage.

## Acceptance Criteria

1. **Given** a request for an area/time
2. **When** executed
3. **Then** the result is stored in the cache/DB
4. **And** if a duplicate request comes, cached data is returned immediately
5. **And** the system calculates feature count to determine if coverage is "Low Confidence"

## Tasks / Subtasks

- [x] 1. Implement Results Caching Logic in Worker/DB (AC: 1, 3, 4)
  - [x] Add caching check in `worker/index.ts` to query standard Kysely DB or Redis before triggering the Overpass API fetch.
  - [x] Store successful Overpass query results in the `osm_data` table (or cache equivalent) paired with the unique bounding box and timestamp string.
  - [x] Ensure the worker returns the cached data immediately if a duplicate boundary and timestamp are submitted.
- [x] 2. Implement Data Density "Low Confidence" Analysis (AC: 5)
  - [x] Develop a density threshold parameterization (e.g., minimum expected features per km²).
  - [x] Update worker payload parser to count features returned by Overpass API.
  - [x] Return a `lowConfidence: true/false` flag alongside the data if the feature count per area metric falls below the threshold.
- [x] 3. Update Integration Tests for Caching and Confidence Flags (AC: 3, 4, 5)
  - [x] Add failing worker tests to assert that cached responses are returned when identical data is requested.
  - [x] Assert that the "Low Confidence" flag correctly triggers for sparse feature regions.

## Dev Notes

- **Architecture Patterns**:
  - The framework offloads external queries to a Node.js Process (Worker) via BullMQ.
  - Data architecture uses PostgreSQL 16 + PostGIS via Kysely. Prefer using the `osm_data` table to store bounding box parameters and results if persisting long-term, or use Redis (already running for BullMQ) for short-term API response caching.
  - Geometry calculations will be handled inside PostGIS later, but initial caching check avoids redundant API bans.
- **Source tree components to touch**:
  - `worker/index.ts` (Implement cache check and feature counting logic)
  - `src/db/migrations/` (If tweaking the `osm_data` table to guarantee fast caching lookups)
  - `src/lib/queue.ts` (Update Job Types to pass density/confidence data)
- **Git Intelligence Info**:
  - Code Review on Story 2.4 implemented rigorous AbortController timeouts and 429 exponential backoffs in `worker/index.ts`. Ensure new caching logic sits *before* the rate-limited Overpass fetch call.
  - Previous stories utilized `.safeParse` with Zod (e.g. `OsmResponseSchema`); ensure feature counting leverages the validated array data.
  - Tests rely heavily on mocking (`tests/worker.test.ts`); expand existing test suites rather than creating entirely new files.
- **Testing standards summary**:
  - Add explicit assertions for `lowConfidence` flags in existing worker tests.
  - Verify Redis/Kysely caching skips the mocked `fetch` call on identical repeated Job invocations.

### Project Structure Notes

- Keep Next.js Server Actions thin. The caching orchestration and the data confidence calculation *must* happen within the worker layer to maintain architectural boundaries. 

### References

- **Architecture constraints**: `_bmad-output/planning-artifacts/architecture.md` (Queue <-> Database boundaries, Kysely DB standard)
- **Epics Details**: `_bmad-output/planning-artifacts/epics.md` (FR10, FR12, Epic 2 requirements)

## Change Log

- 2026-03-01: Addressed code review findings and implemented caching and data density analysis logic in worker.
- 2026-03-01: Applied automatic fixes from code review: robust bounding box parsing, graceful Redis fallbacks and mitigation for global.fetch test pollution.

## File List

- `src/lib/redis.ts` (Modified connection config for test suite stability)
- `tests/worker.test.ts` (Added tests for cache hit/miss and Low Confidence flagging based on density)
- `worker/index.ts` (Implemented Cache check around Overpass Fetch and turf-based area metric for Density calculations)

## Dev Agent Record

### Agent Model Used

Antigravity

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created. Checked previous sprint status and Git commits for implementation continuity.
- Implemented `ioredis` check to intercept worker logic before running the Overpass API fetch.
- Parametrized density calculation via Bounding Box approximation per square KM and returns `lowConfidence: true` for sparse mappings below 5 features/km².
- Tests verified 100% passing after adjusting Redis container to connect via distinct IPv4 127.0.0.1 bindings avoiding Node.js test-runner ECONNREFUSED issues.
- Code review complete: Fixed test suite pollution (`global.fetch` mocks leaking), implemented Redis try/catch gracefully degrade, and ensured rigid bounding box calculations that support ID-nodes without crashing.
