# Story 2.4: Overpass API Client & Rate Limiting

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want to fetch OSM data via Overpass API with strict rate limiting,
so that we avoid API bans while retrieving geometry data.

## Acceptance Criteria

1. **Given** a job is picked up by the worker
2. **When** it calls Overpass
3. **Then** it uses a Token Bucket limiter (1 req/2s)
4. **And** when the API returns data, it is parsed securely
5. **And** if the API fails (429), the job retries with exponential backoff

## Tasks / Subtasks

- [ ] 1. Configure Token Bucket Rate Limiting for BullMQ Queue (AC: 1, 3)
  - [ ] Update worker configuration to apply `limiter: { max: 1, duration: 2000 }` to avoid Overpass API bans.
- [ ] 2. Implement exponential backoff for 429 errors (AC: 5)
  - [ ] Configure BullMQ job settings to retry on failure with backoff strategy `{ type: 'exponential', delay: 2000 }`.
  - [ ] Implement robust error handling to throw errors on 429 status code for BullMQ to catch and retry.
- [ ] 3. Parse Overpass API data securely (AC: 2, 4)
  - [ ] Create a Zod schema to safely validate incoming OSM JSON data structures.
  - [ ] Implement the `fetch` call to the Overpass Interpreter endpoint (`https://overpass-api.de/api/interpreter`).

## Dev Notes

- **Architecture Patterns**:
  - The framework is a Node.js Process (Worker) separate from the Next.js API.
  - Rely on `ioredis` and `bullmq` (integrated in Story 2.3).
  - Heavy calculations and API polling must happen exclusively in the BullMQ worker to avoid blocking the Next.js event loop.
- **Source tree components to touch**:
  - `src/lib/queue.ts` (Queue setup / Job addition logic)
  - `worker/index.ts` (Worker logic for rate-limiting and processing Overpass jobs)
- **Testing standards summary**:
  - Must write/include a unit/integration test to ensure a job fails gracefully with a 429 HTTP response and triggers the exponential backoff logic (using mock fetch).

### Project Structure Notes

- Worker is located in `worker/index.ts`. Next.js API actions are in `src/app/actions/`. Ensure logic remains bounded appropriately.

### References

- **Architecture constraints**: `_bmad-output/planning-artifacts/architecture.md`
- **Web Research**: BullMQ `limiter` option on Worker for token-bucket (max: 1 job per 2 seconds).

## Dev Agent Record

### Agent Model Used

Antigravity (Internal)

### File List
- `src/lib/queue.ts`
- `worker/index.ts`
- `src/app/actions/job.ts` (if testing queue submission)

### Completion Notes

Ultimate context engine analysis completed - comprehensive developer guide created.

**Code Review Output:**
- Fixed HIGH Issue: Added explicit assertions for retry capability and BullMQ settings natively to `tests/worker.test.ts`.
- Fixed HIGH Issue: Added required `User-Agent` header for the Overpass API fetch call.
- Fixed MEDIUM Issue: Added `.safeParse` with `OsmResponseSchema` and robust try/catch so formatting errors throw `UnrecoverableError` rather than crashing process.
- Fixed MEDIUM Issue: Implemented payload validation via `.safeParse` inside the worker for the provided query using `addJobSchema`.
- Fixed LOW Issue: Leveraged `AbortController` and a signal property in the fetch call to ensure a strictly enforced 30s connection timeout.
