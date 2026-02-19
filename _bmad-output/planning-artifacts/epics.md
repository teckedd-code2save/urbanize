---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
---

# urbanize - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for urbanize, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can calculate **Building Density** (Footprint Area / Total Area) within a selected radius.
FR2: Users can calculate **Road Density** (Length / Area) within a selected radius.
FR3: System must perform server-side geometric comparison of OSM Geometry between two selected timepoints.
FR4: System must autocorrect invalid geometries (self-intersecting polygons) before calculation.
FR5: Users can compare two time periods using a **Split-Screen Slider** (Satellite vs. Heatmap).
FR6: Users can toggle between "Building Footprints", "Road Network", and "Ratio View" layers.
FR7: Users can draw a circular boundary (1-3km radius) to define the analysis area.
FR8: Users can download analysis results as a CSV file formatted for R/SPSS.
FR9: Exported files must include a generated **Citation String** (e.g., "Data via Urbanize v1.0...").
FR10: System must cache query results to ensure deterministic outputs for identical requests.
FR11: System must implement a **Token Bucket Queue** (1 req/2s) to manage API rate limits.
FR12: System must provide a "Low Confidence" warning when historical data coverage is below threshold.

### NonFunctional Requirements

NFR1: **Map Interaction:** Tile load < 200ms; Pan/Zoom < 16ms (60fps).
NFR2: **Calculation:** 3km radius historical diff < 30 seconds.
NFR3: **App Load:** LCP < 1.5s on desktop.
NFR4: **Resilience:** 0% rate-limit bans via strict queuing.
NFR5: **Concurrency:** Support 50 concurrent complex queries.
NFR6: **Security:** HTTPS (TLS 1.2+); No PII retention.
NFR7: **Accessibility:** WCAG 2.1 AA compliance; Keyboard navigability for maps.
NFR8: **Data Validity:** "Computed Diff" matches manual ground-truth checks within **5% error**.
NFR9: **Workflow Speed:** "District Timeline" generation in **< 5 minutes**.
NFR10: **Browser Support:** Chrome/Firefox/Edge (Latest 2), Safari (Desktop).

### Additional Requirements

**Architecture:**
- **Starter Template:** Use Next.js Monolith starter with `npx create-next-app@latest . --typescript --tailwind --eslint` and `npx shadcn-ui@latest init` (matches Epic 1, Story 1).
- **Database:** PostgreSQL 16 + PostGIS (via Docker) + Kysely for type-safe SQL.
- **Auth:** Clerk integration.
- **Queue:** BullMQ + Redis for rate limiting functionality.
- **State Management:** TanStack Query + Zustand.
- **Maps:** Mapbox GL JS.
- **Formatting:** `snake_case` DB, `camelCase` TS.
- **Directory Structure:** Mandatory `src/features` organization.
- **API Security:** `next-safe-action` for mutations.

**UX Design:**
- **Platform:** Desktop Web only (no mobile).
- **Interaction:** "Circle Drawing" tool with real-time radius display (1-3km valid range).
- **Interaction:** "Time Travel" timeline scrubber with color-coded data availability.
- **Feedback:** Progressive processing status updates (e.g., "Fetching...").
- **Feedback:** "Citation-Native" exports (metadata in CSV).
- **Visual:** "Split-Screen" comparison (Satellite vs. Heatmap).
- **Visual:** "Low Confidence" warnings for sparse data.
- **Design System:** Tailwind CSS + shadcn/ui.
- **Brand Colors:** Blue (primary), Slate (neutral), Emerald (success), Amber (warning).

### FR Coverage Map

FR1: Epic 3 - Building Density calculation
FR2: Epic 3 - Road Density calculation
FR3: Epic 4 - Server-side geometric comparison
FR4: Epic 3 - Geometry autocorrect
FR5: Epic 4 - Split-Screen comparison
FR6: Epic 3 - Visual layers toggle
FR7: Epic 2 - Circle boundary drawing
FR8: Epic 5 - CSV Export
FR9: Epic 5 - Citation String generation
FR10: Epic 2 - Query result caching
FR11: Epic 2 - Token Bucket Queue
FR12: Epic 2 - Low Confidence warning

## Epic List

### Epic 1: System Foundation & Access
**Goal:** Establishes the secure, deployable web application foundation where users can log in and interact with the geospatial map interface.
**Value:** "I can access the tool securely and view the world map."
**FRs Covered:** (Infrastructure for all)

### Epic 2: Area Selection & Data Retrieval
**Goal:** Enables users to precisely define their study area (Circle Drawing) and reliably retrieve historical urban data without hitting API limits.
**Value:** "I can define my distinct research area and get valid data."
**FRs Covered:** FR7, FR11, FR10, FR12

### Epic 3: Urban Density Metrics & Visualization
**Goal:** Empowers users to calculate and visualize core density metrics (Building & Road) for their selected area.
**Value:** "I can see the density data for my area."
**FRs Covered:** FR1, FR2, FR4, FR6

### Epic 4: Temporal Comparison & Analysis
**Goal:** Unlocks the "Time Travel" capability, allowing users to strictly compare two time periods and visualize the geometric difference.
**Value:** "I can compare the past and present to prove change."
**FRs Covered:** FR3, FR5

### Epic 5: Academic Export & Validation
**Goal:** Completes the workflow by allowing users to export their analysis in a citation-ready format for their thesis.
**Value:** "I can download defensible data for my research paper."
**FRs Covered:** FR8, FR9

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: System Foundation & Access

**Goal:** Establishes the secure, deployable web application foundation where users can log in and interact with the geospatial map interface.

### Story 1.1: Project Initialization & Repository Setup

As a Developer,
I want to initialize the Next.js Monolith with the specified stack (TypeScript, Tailwind, shadcn/ui),
So that the team has a consistent codebase to work from.

**Acceptance Criteria:**

**Given** the implementation environment
**When** I run the initialization commands
**Then** a Next.js 14+ app is created with TypeScript, Tailwind, and ESLint configured
**And** `npx shadcn-ui@latest init` has been run successfully
**And** `package.json` contains all required dependencies
**And** `npm run dev` starts the application on localhost:3000

### Story 1.2: Database & ORM Configuration

As a Developer,
I want to set up PostgreSQL with PostGIS and configure Kysely,
So that we can store and query geospatial data type-safely.

**Acceptance Criteria:**

**Given** Docker is installed
**When** I run `docker-compose up`
**Then** a PostgreSQL 16 container with PostGIS extension enabled is running
**And** I can connect to the database using Kysely configured in `src/db`
**And** I can execute a test query successfully
**And** a migration script setup is in place

### Story 1.3: User Authentication Integration

As a User,
I want to sign up and log in using Clerk,
So that I can securely access the application.

**Acceptance Criteria:**

**Given** I am on the landing page
**When** I click "Sign In"
**Then** I am redirected to the Clerk authentication flow
**And** after login, I am redirected to the dashboard
**And** protected routes (`/dashboard`) reject unauthenticated users
**And** the `user_id` is available in the user session

### Story 1.4: Mapbox Integration & Base Map

As a User,
I want to see a map on the dashboard,
So that I can begin my spatial analysis.

**Acceptance Criteria:**

**Given** I am logged in
**When** I visit `/map`
**Then** I see a full-screen interactive map
**And** the base map style is set to Satellite (or can be toggled)
**And** I can pan and zoom the map
**And** the Mapbox API key is securely loaded from environment variables

## Epic 2: Area Selection & Data Retrieval

**Goal:** Enables users to precisely define their study area (Circle Drawing) and reliably retrieve historical urban data without hitting API limits.

### Story 2.1: City Search & Map Positioning

As a User,
I want to search for and select a city (e.g., London, NYC),
So that the map automatically focuses on my research area of interest.

**Acceptance Criteria:**

**Given** I am on the map view
**When** I use the search bar to select "London"
**Then** the map flies to London coordinates
**And** the zoom level is adjusted to show the city context
**And** the validation allows selecting from the pre-indexed list

### Story 2.2: Circle Drawing Interaction

As a Researcher,
I want to draw a circular boundary on the map,
So that I can precisely define the area for density calculation.

**Acceptance Criteria:**

**Given** I am in "Draw Mode"
**When** I click and drag on the map
**Then** a circle is drawn visually
**And** a real-time radius label (e.g., "1.5 km") is displayed as I drag
**And** the tool prevents drawing > 3km radius (shows visual warning)
**And** I can clear or redraw the selection

### Story 2.3: Job Queue Architecture (BullMQ)

As a Developer,
I want to set up BullMQ with Redis,
So that we can handle long-running data fetch tasks asynchronously.

**Acceptance Criteria:**

**Given** Redis is running in Docker
**When** I configure the BullMQ connection in the worker service
**Then** the worker process starts successfully
**And** I can add a test job to the queue
**And** the worker processes it and logs completion

### Story 2.4: Overpass API Client & Rate Limiting

As a System,
I want to fetch OSM data via Overpass API with strict rate limiting,
So that we avoid API bans while retrieving geometry data.

**Acceptance Criteria:**

**Given** a job is picked up by the worker
**When** it calls Overpass
**Then** it uses a Token Bucket limiter (1 req/2s)
**And** when the API returns data, it is parsed securely
**And** if the API fails (429), the job retries with exponential backoff

### Story 2.5: Data Caching & Confidence Analysis

As a System,
I want to cache results and analyze data density,
So that we improve speed and warn users about poor data coverage.

**Acceptance Criteria:**

**Given** a request for an area/time
**When** executed
**Then** the result is stored in the cache/DB
**And** if a duplicate request comes, cached data is returned immediately
**And** the system calculates feature count to determine if coverage is "Low Confidence"

## Epic 3: Urban Density Metrics & Visualization

**Goal:** Empowers users to calculate and visualize core density metrics (Building & Road) for their selected area.

### Story 3.1: Geometry Processing & Autocorrection

As a Developer,
I want to implement the core geometry processing in the worker,
So that we can handle spatial calculations robustly.

**Acceptance Criteria:**

**Given** raw OSM data in the worker
**When** processed
**Then** invalid geometries are fixed (using `ST_MakeValid`)
**And** geometries are transformed to an Equal-Area projection (Albers) for accurate area calc
**And** processed geometries are stored in the `osm_data` table

### Story 3.2: Building Density Calculation Logic

As a System,
I want to calculate the Building Density metric,
So that users get the primary density value.

**Acceptance Criteria:**

**Given** a study area (circle)
**When** triggered
**Then** the worker calculates: `Sum(Building Footprint Area) / Circle Area`
**And** the result is stored as a percentage (0-100%)
**And** the calculation handles edge cases (e.g., buildings partially outside circle)

### Story 3.3: Road Density Calculation Logic

As a System,
I want to calculate the Road Density metric,
So that users get the secondary infrastructure value.

**Acceptance Criteria:**

**Given** a study area
**When** triggered
**Then** the worker calculates: `Sum(Road Length) / Circle Area`
**And** the result is stored/returned correctly

### Story 3.4: Visualization Layers (Frontend)

As a Researcher,
I want to toggle visual layers on the map,
So that I can see the "Building Footprints" and "Road Network" overlaid on the satellite view.

**Acceptance Criteria:**

**Given** analysis data is ready
**When** I toggle "Building Footprints"
**Then** the vector layer renders on the map
**And** I can toggle "Road Network" to see road lines
**And** I can switch between them without reloading

### Story 3.5: Metric Display UI

As a User,
I want to see the calculated numbers clearly,
So that I can read the density values.

**Acceptance Criteria:**

**Given** calculation is complete
**When** I view the dashboard
**Then** "Building Density: X%" is displayed
**And** "Road Density: Y km/km²" is displayed
**And** tooltips explain the formula (Methodology Transparency)

## Epic 4: Temporal Comparison & Analysis

**Goal:** Unlocks the "Time Travel" capability, allowing users to strictly compare two time periods and visualize the geometric difference.

### Story 4.1: Timeline UI & Time Period Selection

As a User,
I want to select two distinct years (e.g., 2015 vs. 2023) on a timeline,
So that I can define the "Time Travel" comparison.

**Acceptance Criteria:**

**Given** I have selected a city
**When** I use the timeline slider
**Then** I can pick a "Year A" (Past) and "Year B" (Present)
**And** the timeline shows color-coded data availability (Green/Yellow/Red)
**And** the selection triggers a fetch for both time periods

### Story 4.2: Server-Side Geometric Diff Logic

As a Developer,
I want to implement the geometric diff calculation in PostGIS,
So that we can accurate determine what changed between Year A and Year B.

**Acceptance Criteria:**

**Given** geometries for Year A and Year B
**When** the worker runs the diff logic
**Then** it identifies "New Features" (Present in B, not A) and "Lost Features" (Present in A, not B)
**And** it calculates the net change in density area
**And** this calculation happens on the server (not client-side turf.js)

### Story 4.3: Split-Screen Map Visualization

As a User,
I want to compare the two time periods using a slider,
So that I can visually inspect the urban expansion.

**Acceptance Criteria:**

**Given** data for both years is loaded
**When** I drag the central slider handle
**Then** the left side shows "Year A" and real-time satellite imagery
**And** the right side shows "Year B" with the Heatmap/Vector overlay
**And** the map views are perfectly synchronized (panning one pans the other)

### Story 4.4: Change Delta Quantification Display

As a Researcher,
I want to see the specific percentage change (e.g., "+15% Density"),
So that I can quote this figure in my thesis.

**Acceptance Criteria:**

**Given** the diff calculation is done
**When** I view the results panel
**Then** I see the "Delta" clearly highlighted (e.g., Green "+15%", Red "-5%")
**And** holding the mouse over it shows the raw area values (m² change)

## Epic 5: Academic Export & Validation

**Goal:** Completes the workflow by allowing users to export their analysis in a citation-ready format for their thesis.

### Story 5.1: CSV Export Generation (Server)

As a System,
I want to format the analysis results into a clean CSV,
So that it can be imported directly into R or SPSS without cleanup.

**Acceptance Criteria:**

**Given** analysis results (Building/Road density for 2 time periods)
**When** processed
**Then** a CSV string is generated
**And** the columns are clearly labeled (e.g., `year`, `metric`, `value`, `unit`)
**And** the format is strictly compatible with standard statistics software

### Story 5.2: Citation String Logic

As a Researcher,
I want a citation string included in the export,
So that I can credit the tool and data sources in my thesis.

**Acceptance Criteria:**

**Given** an export request
**When** the CSV is generated
**Then** a metadata header or appended row includes the citation
**And** the string follows the format: "Data generated via Urbanize v{version} using OSM Data {timestamp}"
**And** it includes the algorithm version used

### Story 5.3: Download Interface

As a User,
I want a prominent "Download CSV" button,
So that I can save my work.

**Acceptance Criteria:**

**Given** the analysis is complete
**When** I click "Download CSV"
**Then** the browser initiates a file download
**And** the filename includes the city and timestamp (e.g., `london_analysis_20231027.csv`)
