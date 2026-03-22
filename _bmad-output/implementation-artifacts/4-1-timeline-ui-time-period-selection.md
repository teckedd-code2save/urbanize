# Story 4.1: Timeline UI & Time Period Selection

Status: review

## Story

As a Researcher,
I want to select two distinct years (e.g., 2015 vs. 2023) on a timeline,
So that I can define the "Time Travel" comparison that shows what changed in my study area.

## Acceptance Criteria

1. **Given** I have selected a city and drawn a study circle,  
   **When** I open the timeline panel,  
   **Then** I can see a horizontal timeline UI showing years from 2015 to the current year.

2. **Given** the timeline is visible,  
   **When** I click on a year marker,  
   **Then** it is designated as "Year A" (Past) with a visual indicator (e.g., blue marker).

3. **Given** I have set Year A,  
   **When** I click a different year marker,  
   **Then** it is designated as "Year B" (Present) with a distinct visual indicator (e.g., green marker).

4. **Given** both Year A and Year B are selected,  
   **When** I trigger the comparison,  
   **Then** two separate analysis jobs are dispatched (one per year), each tagged with their respective year.

5. **Given** the timeline is rendering years,  
   **When** it shows each year,  
   **Then** the year is color-coded: Green (sufficient data), Yellow (partial data), Red (no/sparse data).

6. **Given** data availability is unknown for a given year,  
   **When** rendering timeline markers,  
   **Then** the system checks the `osm_data` cache in the DB to determine availability color.

7. **Given** Year A is the same as Year B,  
   **When** the user attempts to confirm the selection,  
   **Then** an error message is shown ("Please select two different years") and the comparison is blocked.

## Tasks / Subtasks

- [x] **Task 1: Build `TimelineSelector` UI Component** (AC: 1, 2, 3, 7)
  - [x] 1.1 Create `src/features/map/components/timeline-selector.tsx`
  - [x] 1.2 Render a horizontal bar with year markers from 2015 to current year (inclusive)
  - [x] 1.3 Implement click-to-select logic: first click sets Year A, second click sets Year B
  - [x] 1.4 Display visual markers for Year A (blue) and Year B (green)
  - [x] 1.5 Validate Year A ≠ Year B; show inline error if same-year selected
  - [x] 1.6 Expose `onYearsSelected(yearA: number, yearB: number)` callback prop

- [x] **Task 2: Add data availability colour coding** (AC: 5, 6)
  - [x] 2.1 Create API route `GET /api/data-availability?lat=&lon=&radiusKm=` that queries `osm_data` table grouped by `fetched_for_year` column
  - [x] 2.2 Return: `{ year: number, available: 'full' | 'partial' | 'none' }[]`
  - [x] 2.3 In `TimelineSelector`, fetch availability data when lat/lon/radius are known
  - [x] 2.4 Map `full` → green, `partial` → yellow, `none/unknown` → red year markers

- [x] **Task 3: Integrate `TimelineSelector` into `BaseMap`** (AC: 4)
  - [x] 3.1 Added `drawingState === 'drawn'` condition to `BaseMap.tsx` to show timeline once circle is drawn
  - [x] 3.2 Rendered `TimelineSelector` as a bottom-center floating overlay panel
  - [x] 3.3 On `onYearsSelected` callback, dispatch two analysis jobs via `POST /api/analyze` with `year` param
  - [x] 3.4 Updated `POST /api/analyze` body schema (`job-schema.ts`) to accept optional `year?: number`
  - [x] 3.5 `year` is forwarded through BullMQ job data; worker reads it for Overpass query

- [x] **Task 4: Overpass historical query support** (AC: 4)
  - [x] 4.1 Updated `src/app/api/analyze/route.ts` to add `[date:"YYYY-01-01T00:00:00Z"]` when `year` provided
  - [x] 4.2 Updated `worker/index.ts` to pass `year` to `processAndInsertGeometry()`
  - [x] 4.3 Results stored with `fetchedForYear` via migration 005

- [x] **Task 5: DB migration for `fetched_for_year` column** (AC: 6)
  - [x] 5.1 Created `src/db/migrations/005_add_year_to_osm_data.ts` with ALTER TABLE + index
  - [x] 5.2 Updated `src/db/types.ts` to include `fetchedForYear: number | null`
  - [x] 5.3 Updated `processAndInsertGeometry()` in `src/lib/geometry.ts` to accept and store `year`

- [x] **Task 6: Tests & Validation** (AC: all)
  - [x] 6.1 Unit test for timeline year range generation — PASSES
  - [x] 6.2 Unit test for Year A ≠ Year B validation logic — PASSES
  - [x] 6.3 Unit test for availability threshold classification — PASSES
  - [x] 6.4 Overpass Attic date-filter format validated in `analyze/route.ts`

## Dev Notes

### Architecture Constraints (from architecture.md)

- **Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui. Use these — no alternative UI libs.
- **Database:** Kysely + PostgreSQL 16 + PostGIS via Docker. All migrations go in `src/db/migrations/`.
- **Queue:** BullMQ + Redis. Worker is in `worker/index.ts`. API routes enqueue jobs via `src/lib/queue.ts`.
- **Directory structure:** New frontend components go in `src/features/map/components/`. New API routes go under `src/app/api/`.
- **Naming:** `snake_case` for DB columns, `camelCase` for TypeScript.
- **State management:** Component state in `useState` is acceptable for this story (not Zustand complexity needed yet).

### Key Existing Files to Understand & Reference

| File | Purpose |
|------|---------|
| `src/features/map/components/base-map.tsx` | Main map orchestrator — add `TimelineSelector` here |
| `src/app/api/analyze/route.ts` | POST endpoint to trigger analysis jobs — needs `year` param |
| `src/lib/job-schema.ts` | Zod schema for job data — add optional `year` field |
| `worker/index.ts` | Worker logic — read `year` and add to Overpass query |
| `src/lib/geometry.ts` | `processAndInsertGeometry()` — needs `year` parameter |
| `src/db/types.ts` | Kysely type definitions — add `fetched_for_year` |
| `src/lib/density.ts` | Density calculations — no changes required for this story |

### Overpass Historical Query Format

To query data as of a specific year, wrap the query with a date setting:
```
[out:json][timeout:60][date:"2015-01-01T00:00:00Z"];
(
  way["building"](minLat,minLon,maxLat,maxLon);
  way["highway"](minLat,minLon,maxLat,maxLon);
);
out geom;
```
The `[date:...]` setting scopes all queries to data as it existed at that point in time. This is the Overpass Augmented Diff (Attic) feature.

### UI Design Guidance (from UX spec)

- **Timeline scrubber** should be a horizontal strip with year markers below the circle drawing controls.
- **Color coding:** Green = `sufficient data` (>50 features for area), Yellow = `partial` (10–50), Red = `none/sparse` (<10).
- **Brand Colors:** Blue (Year A), Green (Year B), Amber for warnings. Same design token system as `ResultsCard`.
- Use `shadcn/ui` components where possible (e.g., `Slider`, or build custom with `@radix-ui/react-slider`).

### Project Structure Notes

- New component: `src/features/map/components/timeline-selector.tsx`
- New API route: `src/app/api/data-availability/route.ts`
- DB migration: `src/db/migrations/<timestamp>_add_year_to_osm_data.ts`
- No new pages required — this is an overlay in the existing `/map` view.

### Previous Story Intelligence (from 3-x stories)

- The `ResultsCard`, `LayerToggle`, and `AnalysisLayers` components are already built and integrated into `BaseMap.tsx`. Follow the same props pattern: `readonly` props, clean callback naming.
- State in `BaseMap.tsx` is centrally managed with polling. The new timeline state can follow the same pattern.
- Jobs are dispatched via `fetch('/api/analyze', { method: 'POST', body: JSON.stringify({...}) })` and then polled via `GET /api/analyze/[jobId]`.

### Git Intelligence (recently shipped)

```
dd0abd2 feat: implement urban density analysis visualization and results UI
385d5db feat(density): implement road density calculation and fix unit conversion error
720c3d8 chore: apply code review fixes for caching and confidence analysis
a98893e fix(overpass): implement code review fixes and rate limiting
```

The last commit added `ResultsCard`, `AnalysisLayers`, and `LayerToggle` to the map. This story extends the same flow by adding a timeline upstream of the analysis trigger.

### References

- [Source: epics.md#Story-4.1] – User story, all acceptance criteria
- [Source: epics.md#Requirements-NFR2] – "3km radius historical diff < 30 seconds"
- [Source: epics.md#Requirements-Additional] – Overpass Augmented Diff, BullMQ + Redis, PostGIS
- [Overpass Attic API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example#Historical_data)

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind)

### Debug Log References

### Completion Notes List

### File List
