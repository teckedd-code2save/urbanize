---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The system is a **Geospatial Time-Travel Engine** that enables students to generate academic-grade urban density comparisons. Key architectural drivers include:
1.  **Server-Side Geometry Processing:** "Computed Diff" of building/road density must happen on the server (PostGIS/Python) for accuracy, not client-side.
2.  **Strict Queuing System:** A Token Bucket mechanism to throttle requests to external APIs (Overpass/Google) to strictly avoid bans.
3.  **Visual Comparison:** A split-screen WebGL map (Satellite vs. Heatmap) requiring synchronized state management.
4.  **Academic Export:** Data handling must support "Citation-Native" exports (metadata-enriched CSVs).

**Non-Functional Requirements:**
-   **Performance:** < 30s calculation time is a hard constraint associated with the UX "Waiting is Learning" pattern.
-   **Reliability:** Zero API bans allowed; the system must prioritize safety over speed (Queuing).
-   **Accuracy:** 5% error margin target requires precise geodesic calculations (Albers projection).

**Scale & Complexity:**
-   Primary domain: **Web Application / Geospatial Backend**
-   Complexity level: **Medium-High** (Complex geometry logic + Queue management)
-   Estimated architectural components: **~8-12** (Frontend, API Gateway, Queue Worker, Geometry Engine, Cache, Data Store, etc.)

### Technical Constraints & Dependencies

-   **Frontend:** Must use **Tailwind CSS + shadcn/ui** and **WebGL maps** (Mapbox/Leaflet).
-   **Data Sources:** Dependent on **OpenStreetMap (Overpass API)** for vectors and **Google Maps** for tiles.
-   **Platform:** Desktop Web only (no mobile complexity for MVP).
-   **Academic Rigor:** Algorithms must be versioned and transparent; no "black box" calculations.

### Cross-Cutting Concerns Identified

1.  **Rate Limiting & Queuing:** Centralized control of all external API calls.
2.  **Caching Strategy:** Aggressive caching of query results to optimize performance and cost.
3.  **Methodology Transparency:** Versioning and exposing calculation logic across UI and Exports.
4.  **Geospatial Projection:** Consistent handling of coordinate systems (EPSG:4326 vs Projected) across the stack.

## Starter Template Evaluation

### Primary Technology Domain

**Full-Stack Web (Geospatial/Academic)** based on project requirements analysis.

### Starter Options Considered

1.  **Vite + React + FastAPI (Hybrid)**: Separates concerns. Best for heavy geospatial math (Python) and rich UI (React). Matches "Microservices" architecture.
2.  **Next.js (Monolith)**: Good for CRUD, but weaker for complex geospatial processing required by "Thesis Test".
3.  **T3 Stack**: Robust TS full-stack, but lacks native Python integration.

### Selected Starter: Next.js Monolith (Full-Stack TypeScript)

**Rationale for Selection:**
The user explicitly requested a **JS/TS stack**, moving away from the hybrid Python approach. This unifies the development experience into a single language (TypeScript) and a single framework (Next.js). While Python is superior for "Academic Rigor" in geospatial math, the Node.js ecosystem (Turf.js, specialized libraries) is sufficient for the defined "Computed Diff" requirements if we leverage **PostGIS** heavily for the heavy lifting.
This matches the project's responsive UX needs (React/shadcn) while simplifying deployment and maintenance.

**Initialization Command:**

```bash
# Full Stack Next.js Setup
npx create-next-app@latest . --typescript --tailwind --eslint
npx shadcn-ui@latest init
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
-   **Full Stack:** TypeScript (Node.js) for both Frontend and Backend.

**Styling Solution:**
-   **Tailwind CSS** + **shadcn/ui**.

**Build Tooling:**
-   **Next.js (App Router)** for unified build, API routes, and SSR.

**Development Experience:**
-   **Monorepo-feel:** Single repository, single server to run `npm run dev`.

**Note:** This shifts the "Heavy Geospatial Math" burden to the **Database Layer (PostGIS)** to avoid Node.js event loop blocking.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1.  **Framework:** Next.js 16 (App Router) - *Decision: Monolith*
2.  **Database Access:** Kysely - *Decision: Type-safe SQL Builder*
3.  **Authentication:** Clerk - *Decision: Managed Auth*
4.  **Job Queue:** BullMQ + Redis - *Decision: Persistent Worker for Overpass API*

**Important Decisions (Shape Architecture):**
1.  **State Management:** TanStack Query (Server State) + Zustand (Client State).
2.  **Map Library:** Mapbox GL JS (via generic wrapper or `react-map-gl`) for WebGL performance.
3.  **Validation:** Zod (Shared schemas between API/Client).

**Deferred Decisions (Post-MVP):**
1.  **Multi-language Support:** i18n implementation deferred.
2.  **Advanced Caching:** Redis caching for API responses (handled by Next.js Cache initially).
3.  **Analytics:** PostHog/Google Analytics.

### Data Architecture

*   **Database:** **PostgreSQL 16 + PostGIS**.
    *   *Rationale:* Industry standard for geospatial data. Required for "Thesis Native" exports.
*   **Data Access:** **Kysely**.
    *   *Version:* Latest Stable.
    *   *Rationale:* Superior TypeScript support for raw SQL compared to Prisma. Essential for `ST_Intersects` and other complex PostGIS functions.
*   **Migrations:** **Kysely-CTL** or native SQL migrations.
    *   *Rationale:* explicit control over database schema changes.
*   **Validation:** **Zod**.
    *   *Rationale:* Single source of truth for validation logic.

### Authentication & Security

### Authentication & Security

*   **Provider:** **Clerk**.
    *   *Rationale:* Fastest integration for Next.js. Handles sessions, MFA, and user management out of the box.
    *   *Direct Comparison (NextAuth):* While NextAuth (Auth.js) is free/open-source, it requires maintaining session tables, handling OAuth flow edge cases, and building custom UI components. For a solo/small team, Clerk saves ~2-3 weeks of development time.
*   **Authorization:** Role-based access controlled via Clerk Metadata + Middleware.
*   **API Security:** Route Handlers protected by Clerk Middleware. Database access restricted to Server Components/Actions.

### Data Storage Alternatives Considered

*   **ClickHouse:**
    *   *Fit:* Excellent for storing "Billions of Rows" (e.g., global OSM Node history or user telemetry). Can generate MVT tiles extremely fast.
    *   *Verdict (MVP):* **Rejected**. While faster for *aggregations* ("Count all trees in Ghana"), it lacks the precise OGC-compliant *mutation* functions (`ST_Difference`, `ST_Split`, `ST_Snap`) required for the "Computed Diff" academic rigor. PostGIS is the gold standard for *geometry manipulation*, ClickHouse is the gold standard for *log analytics*.
    *   *Future Use Case:* Storing long-term user interaction logs (via PostHog) or if we need to render millions of *static* points (e.g., every tree in Africa) in real-time.

### API & Communication Patterns

*   **API Style:** **Next.js Server Actions** (Mutations) + **TanStack Query** (Data Fetching).
    *   *Rationale:* Simplifies the "API" layer by co-locating logic. BullMQ handles long-running tasks asynchronously.
*   **Queue System:** **BullMQ (Redis)**.
    *   *Rationale:* Critical for the "Token Bucket" rate limiting required by Overpass API. Allows separating the "Fetch" job from the user request.

### Frontend Architecture

### Frontend Architecture

*   **Framework:** **React 18/19 (Server Components)**.
*   **Styling:** **Tailwind CSS** + **shadcn/ui**.
    *   *Rationale:* Rapid UI development with accessible components.
*   **Maps:** **Mapbox GL JS** (Satellite Usage).
    *   *Rationale:* Best performance for large vector datasets.
    *   *Context Note (Ghana):* Satellite imagery quality is critical. Mapbox Satellite (Maxar/DigitalGlobe) generally has excellent coverage in West Africa, but we should implementing a toggle to switch to Google Maps Tiles (raster) via `deck.gl` or `react-map-gl` if specific rural areas lack detail in Mapbox.
*   **Client-Side Geometry:** **Turf.js**.
    *   *Usage:* Use ONLY for lightweight client-side operations (e.g., calculating area of a drawn polygon, buffering a single point). HEAVY operations (intersections of thousands of buildings) MUST be sent to the **Worker/PostGIS**.

### Infrastructure & Deployment

### Infrastructure & Deployment

*   **Strategy:** **Docker Compose (Monolith)**.
    *   *Rationale:* Simplifies local dev and deployment to PAAS (Railway/Render).
*   **Services:**
    1.  `app`: Next.js (Frontend + API)
    2.  `worker`: Node.js (BullMQ Processor)
    3.  `db`: PostGIS
    4.  `redis`: Redis (Queue/Cache)

### Third-Party Provider Summary

| Feature | Provider | Rationale for Ghana Context |
| :--- | :--- | :--- |
| **Auth** | **Clerk** | Auth is universal; reliability > cost initially. |
| **Maps (Base)** | **Mapbox** | High-performance Vector Tiles. Good Africa coverage. |
| **Maps (Alt)** | **Google Maps** | Fallback for Satellite imagery if Mapbox is outdated in rural Ghana. |
| **Data Source** | **OpenStreetMap** | Best open data source for Ghana (highly active community). |
| **Email** | **Resend** | Reliable transactional email delivery to region. |
| **Analytics** | **PostHog** | Open-source product analytics. |

### Decision Impact Analysis

**Implementation Sequence:**
1.  **Scaffold:** Next.js + Kysely + PostGIS (Docker).
2.  **Auth:** Clerk Integration.
3.  **Core Geospatial:** Database Schema + Seed Script (Kysely).
4.  **Queue:** BullMQ setup for Overpass Rate Limiter.
5.  **UI:** Mapbox + Sidebar + "Waiting is Learning" Pattern.

**Cross-Component Dependencies:**
*   **Queue <-> Database:** Worker needs direct DB access to save Overpass results.
*   **Auth <-> Database:** User IDs from Clerk need to be foreign keys in our DB (stored as strings).

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
1.  **Naming:** Database (snake) vs JS (camel).
2.  **Structure:** "Atomic" vs "Feature" folders.
3.  **Communication:** Server Action Return Formats.
4.  **Process:** Error Handling Strategy.

### Naming Patterns

**Database Naming Conventions:**
*   **Format:** `snake_case` (PostgreSQL Standard).
*   **Tables:** Plural (`users`, `urban_parameters`).
*   **Columns:** `is_active`, `created_at`.
*   **Foreign Keys:** `user_id` (singular table name + `_id`).
*   **Automatic Conversion:** Kysely `CamelCasePlugin` **MUST** be used to convert `snake_case` DB to `camelCase` TS automatically.

**Code Naming Conventions:**
*   **Variables/Functions:** `camelCase` (`getUserData`).
*   **Components:** `PascalCase` (`MapSidebar`).
*   **Files:** `kebab-case` (`map-sidebar.tsx`) or `camelCase` for utilities (`dateUtils.ts`).
*   **Directories:** `kebab-case` (`urban-parameters`).

### Structure Patterns

**Project Organization:**
*   **Root:** `src/` directory is **MANDATORY**.
*   **Features:** Feature-based organization in `src/features/`.
    *   Example: `src/features/map/components/`, `src/features/map/actions.ts`.
*   **App Router:** `src/app/` solely for routing and page entry points.
    *   Pages should be thin wrappers importing feature components.

### Format Patterns

**API/Action Response Formats:**
*   **Wrapper:** Use `next-safe-action` return type.
    *   Success: `{ data: T }`
    *   Error: `{ serverError: string, validationErrors: Record<string, string[]> }`
*   **Dates:** ISO 8601 Strings in API, native `Date` objects in Server Components (if direct DB access).

### Process Patterns

**Error Handling Patterns:**
*   **Server Actions:** **NEVER THROW** for expected errors. Return the error object.
*   **Uncaught:** Use `error.tsx` boundaries for crashes.
*   **Validation:** **Zod** schema required for ALL Server Actions.

**Enforcement Guidelines:**

**All AI Agents MUST:**
1.  Use `next-safe-action` for ANY mutation.
2.  Place business logic in `src/features`, NOT `src/app`.
3.  Use Kysely auto-generated types from the DB Schema.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
urbanize/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.example                # Template for environment variables
├── docker-compose.yml          # Orchestration for App, Worker, DB, Redis
├── README.md
├── src/
│   ├── app/                    # App Router (Routing Layer ONLY)
│   │   ├── (auth)/             # Auth Route Group
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/        # Main App Route Group
│   │   │   ├── layout.tsx      # Dashboard Layout (Sidebar, etc.)
│   │   │   ├── map/page.tsx    # Map View
│   │   │   └── history/page.tsx
│   │   ├── api/                # Public API / Webhooks
│   │   │   ├── webhooks/
│   │   │   └── ...
│   │   ├── layout.tsx          # Root Layout (Providers)
│   │   ├── page.tsx            # Landing Page
│   │   └── globals.css
│   ├── components/             # Shared Atomic UI Components
│   │   ├── ui/                 # shadcn/ui components (Button, Input)
│   │   └── layouts/            # Shared layout components
│   ├── db/                     # Database Configuration
│   │   ├── index.ts            # Kysely Instance
│   │   ├── types.ts            # Generated DB Types
│   │   ├── migrations/         # SQL/TS Migrations
│   │   └── seeder.ts
│   ├── features/               # Feature Modules (Domain Logic)
│   │   ├── auth/               # Auth Feature
│   │   ├── map/                # Map & Geometry Feature
│   │   │   ├── components/     # Map-specific UI
│   │   │   ├── hooks/          # Mapbox hooks
│   │   │   ├── actions.ts      # Server Actions
│   │   │   └── utils.ts
│   │   ├── urban-parameters/   # Parameter Calculation Feature
│   │   └── user/               # User Management Feature
│   ├── lib/                    # Shared Utilities / Infrastructure
│   │   ├── env.ts              # Env Validation (t3-env)
│   │   ├── redis.ts            # Redis Instance
│   │   └── queue.ts            # BullMQ Setup
│   └── types/                  # Global Shared Types
├── worker/                     # Separate Worker Setup (Optional if Monolith)
│   └── index.ts                # BullMQ Worker Entry
└── tests/
    ├── e2e/                    # Playwright Tests
    └── integration/            # API Tests
```

### Architectural Boundaries

**API Boundaries:**
*   **Public API:** `src/app/api/*` - Exposed to external world/webhooks. Guarded by Key or Webhook Secret.
*   **Internal Actions:** `src/features/*/actions.ts` - Exposed via Next.js RPC. Guarded by `next-safe-action` (Auth + Validation).

**Service Boundaries:**
*   **Web App:** Next.js Server (Port 3000). Handles UI and fast I/O.
*   **Worker:** Node.js Process (BullMQ). Handles "Heavy Math" and "Overpass Fetching".
*   **Database:** PostgreSQL (Port 5432). Strictly typed via Kysely.

**Data Boundaries:**
*   **Raw Data:** Overpass API (External) -> Ingested by Worker -> Stored in `osm_data` table.
*   **Processed Data:** `urban_parameters` table -> Read by Next.js via Kysely.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
1.  **Visualizing Urban Parameters:**
    *   UI: `src/features/map/components/ParameterLayer.tsx`
    *   Logic: `src/features/urban-parameters/`
2.  **System Access:**
    *   UI: `src/app/(auth)/`
    *   Logic: `src/features/auth/`
3.  **Data Management (History):**
    *   UI: `src/features/user/components/HistoryTable.tsx`
    *   DB: `src/db/migrations/*_create_history_tables.ts`

### Integration Points

**Internal Communication:**
*   **UI -> Server:** Server Actions (Mutations) / generic `useQuery` (Reads).
*   **Server -> Worker:** `userRequestQueue.add()` (BullMQ).
*   **Worker -> DB:** Direct Kysely Write.
*   **DB -> UI:** Next.js Revalidation or direct read.

### Development Workflow Integration

*   **Dev Server:** `npm run dev` starts Next.js. `npm run worker` starts Queue Processor.
*   **Docker:** `docker-compose up` spins up Postgres + Redis.
*   **Deployment:**
    *   **Frontend:** `npm run build` -> `.next/standalone`
    *   **Worker:** Transpiled TS -> `node dist/worker/index.js`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
*   **Next.js + Kysely:** Highly compatible. Kysely runs efficiently in Server Components (RSC) and Server Actions without cold-start penalties of heavier ORMs.
*   **Clerk + PostGIS:** Clerk handles Identity; PostGIS handles Data. Integration is via `user_id` string, which is standard distributed systems practice.
*   **BullMQ + Monolith:** Running the worker as a separate process (via Docker/Railway) prevents CPU-blocking math from freezing the Next.js web server.

**Pattern Consistency:**
*   **Naming:** `CamelCasePlugin` bridges the gap between DB `snake_case` and JS `camelCase` effectively.
*   **Structure:** Feature-based structure aligns with the modular nature of the "Urban Parameters" logic.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
*   **Visualizing Urban Parameters:** Covered by `src/features/map` + Mapbox.
*   **System Access:** Covered by `src/features/auth` + Clerk.
*   **Data Management:** Covered by `src/features/user` + Kysely History tables.

**Non-Functional Requirements Coverage:**
*   **Performance:** "Heavy Math" offloaded to BullMQ Worker.
*   **Reliability (0 Bans):** Token Bucket Rate Limiting implemented in BullMQ Queue.
*   **Accuracy:** PostGIS internal geometry types (Float8 precision) ensure academic rigor.

### Implementation Readiness Validation ✅

**Decision Completeness:**
All major stack decisions (Framework, DB, Auth, Queue) are locked. Versions are latest/stable (Next 16, Pg 16).

**Gap Analysis:**
1.  **Critical Gap:** Specific geometric algorithms for "building density" need to be defined in SQL/TypeScript. (Implementation Detail).
2.  **Important Gap:** WebGL Mapbox styling for "Heatmaps" needs design during implementation.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH - The stack is standard, modern, and well-suited for the specific constraints (Geospatial + Web).

**Implementation Handoff:**
*   **First Priority:** Run the Next.js scaffold command and set up the Kysely/PostGIS connection.
