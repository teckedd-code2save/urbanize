# Story: 2-3-job-queue-architecture-bullmq

## 📖 Story Foundation

**Epic**: 2 (Area Selection & Data Retrieval)
**Title**: Job Queue Architecture (BullMQ)

**User Story Statement:**
As a Developer,
I want to set up BullMQ with Redis,
So that we can handle long-running data fetch tasks asynchronously.

### 🎯 Acceptance Criteria
- **Given** Redis is running in Docker
- **When** I configure the BullMQ connection in the worker service
- **Then** the worker process starts successfully
- **And** I can add a test job to the queue
- **And** the worker processes it and logs completion

---

## 👨‍💻 Developer Context & Guardrails

This section contains critical intelligence and constraints for the developer. **DO NOT IGNORE.**

### 🛑 Technical Requirements

- **Strict Queuing System:** A Token Bucket mechanism to throttle requests to external APIs (Overpass/Google) to strictly avoid bans.
- BullMQ must be configured to work with the Redis instance defined in our `docker-compose.yml`.
- The worker should run as a separate process from Next.js, as we need to avoid CPU-blocking math that would freeze the web server.

### 🏗️ Architecture Compliance

- **Framework**: Node.js Process (BullMQ Worker) / Next.js (App Router)
- **Database/Storage**: PostgreSQL (via Kysely) + Redis (for BullMQ)
- **Infrastructure Strategy**: Docker Compose (Monolith) Services: `app`, `worker`, `db`, `redis`
- **Pattern**: Next.js Server Actions will push jobs to BullMQ. The BullMQ worker will process them and update the DB using Kysely.

### 📚 Framework & Library Constraints

- **Redis Client**: Expected to use `ioredis` (standard with BullMQ).
- **BullMQ**: Latest stable 5.x version recommended.
- **Validation**: Zod schema required for ALL job payloads/Server Actions if Next.js initiates the queue addition.
- **Types**: Use strict TypeScript definitions for Job Data and Return Values.

### 📁 File Structure Requirements

- Worker entry point: `worker/index.ts` (Separate from Next app)
- Shared Queue utilities (for adding jobs from Next.js): `src/lib/queue.ts`
- Shared Redis client: `src/lib/redis.ts`

### 🧪 Testing & Validation Requirements

- Must demonstrate that a test job can be successfully added to the queue from Next.js and picked up/processed by the separate Worker process.
- The worker process must gracefully handle connections to Redis.

---

## 🌐 External Context (Latest Tech Info)

- **BullMQ**: Ensure you distinguish between `Queue` (instantiated in Next.js to add jobs) and `Worker` (instantiated in `worker/index.ts` to process them). They must connect to the same Redis instance.
- **Node.js**: Since the worker is a separate process, ensure its TS compilation/execution is handled correctly (e.g., using `tsx` or `ts-node` for dev, or compiling to `dist/worker` for production).

---

## 📊 Completion Status

- **Status**: review
- **Notes**: Ultimate context engine analysis completed - comprehensive developer guide created. Ready for implementation.

## 📝 Dev Agent Record
- **Completion Notes**:
  - Installed `bullmq` and `ioredis`
  - Added `redis:7-alpine` service to `docker-compose.yml`
  - Configured shared Redis client in `src/lib/redis.ts`
  - Created Queue singleton in `src/lib/queue.ts`
  - Implemented standalone worker process in `worker/index.ts` with graceful shutdown and rate limiting
  - Created a test server action `addTestJob` in `src/app/actions/job.ts` to push jobs
  - Updated `package.json` to add the `worker` start script

## 📂 File List
- `package.json` (modified)
- `docker-compose.yml` (modified)
- `src/lib/redis.ts` (new)
- `src/lib/queue.ts` (new)
- `worker/index.ts` (new)
- `src/app/actions/job.ts` (new)

## 🔄 Change Log
- **[Date: 2026-02-25]**: Setup BullMQ architecture. Implemented Redis connection, Next.js Queue client, and backend worker service to asynchronously process data fetch requests. Added a server action for integration testing.
