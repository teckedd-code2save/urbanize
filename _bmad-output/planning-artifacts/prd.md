---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
classification:
  projectType: 'web_app'
  domain: 'scientific'
  complexity: 'medium_high'
  projectContext: 'greenfield'
inputDocuments: ['_bmad-output/planning-artifacts/product-brief-urbanize-2026-02-12.md', '_bmad-output/planning-artifacts/research/technical-urban-parameter-calculation-research-2026-02-12.md', '_bmad-output/brainstorming/brainstorming-session-2026-01-29.md', '_bmad-output/brainstorming/brainstorming-session-2026-02-01.md']
workflowType: 'prd'
---

# Product Requirements Document - urbanize
**Author:** precisionxxx
**Date:** 2026-02-12

## Success Criteria

### User Success (The Student Researcher)
*   **Data Validity:** "Computed Diff" matches manual ground-truth checks within **5% error** (viable for thesis).
*   **Workflow Speed:** "District Timeline" generation in **< 5 minutes** (down from 2 weeks).
*   **Export Readiness:** CSVs formatted directly for R/SPSS without manual cleaning.
*   **The "Thesis Test":** User can generate a valid Density vs. Traffic correlation graph in < 10 mins.

### Business Success (Academic Goals)
*   **Methodological Acceptance:** Logic is transparent/defensible for thesis methodology.
*   **Publication Quality:** Visualizations differ enough to be used directly in final papers.
*   **Historical Coverage:** Successfully retrieves data for at least 3 distinct time periods (e.g., 2015, 2020, 2025).

### Technical Success
*   **Processing Speed:** 3km radius historical diff calculated in **< 30 seconds**.
*   **Stability:** **0 API bans** from Google/Overpass during batch runs (Queue System effective).
*   **Concurrency:** Handles **50 concurrent queries** without crashing.
*   **Accuracy:** Server-side geometric diffing avoids client-side approximation errors.

## Product Scope & Phasing

### MVP - "The Thesis Defender"
**Focus:** Solves the manual counting problem with high rigor.
*   **Search:** Pre-indexed city selection (London, NYC, Singapore) to guarantee data availability.
*   **Time-Travel:** Select 2 distinct years (e.g., 2015 vs 2023) for comparison.
*   **Metric Engine:** Calculate "Building Density" and "Road Density" for user-drawn circular radius (1-3km).
*   **Diff Engine:** Server-side geometric comparison of the two time periods.
*   **Visualization:** Split-screen map (Satellite vs. Heatmap) with "Swipe" UI.
*   **Export:** One-click CSV download with citation metadata.
*   **Constraints:** Desktop Web only.

### Growth Features (Phase 2 - "The City Planner")
*   **Ratio View:** Visualizing Building vs. Road density.
*   **Admin Dashboard:** Token bucket monitoring and usage alerts.
*   **Reporting:** High-Res Screenshot generator.
*   **Advanced Tools:** Custom Polygon drawing.

### Vision (Phase 3 - "The Vision")
*   **Global Search:** Expansion anywhere on Earth.
*   **Live Traffic:** Real-time sensor integration.
*   **Sim-City Mode:** Draw new buildings to project future impact.
*   **Mobile:** Tablet/Phone support.

## User Journeys

### 1. Sarah, The Stressed Student (Core Workflow)
**Goal:** Generate thesis data in < 5 minutes.
*   **Flow:** Logs in -> Selects "London" -> Draws 2km radius -> Sets Timeframe (2015 vs 2023).
*   **System Action:** Queues request -> Calculates Diff -> Displays Split-Screen.
*   **Outcome:** Downloads CSV formatted for R-Studio. Pastes "Density vs. Time" graph into thesis.

### 2. David, The City Planner (Visuals)
**Goal:** Justify infrastructure budget.
*   **Flow:** Selects "Ratio View" -> Toggles "Building Footprints (Red)" and "Road Network (Blue)".
*   **Outcome:** Takes high-res screenshot of "Red" heatmap (High Building / Low Road ratio) for town hall meeting.

### 3. Sam, The System Admin (Stability)
**Goal:** Prevent API Bankruptcy.
*   **Flow:** Monitors Admin Dashboard during finals week spike.
*   **System Action:** Queue System creates backpressure (2s -> 5s wait) but ensures **zero failures**.
*   **Outcome:** Google API costs remain within cap. Cache hit rate improves.

### 4. Sarah, The Edge Case (Handling Gaps)
**Goal:** Handle missing historical data gracefully.
*   **Flow:** Requests data for "Rio de Janeiro 2010".
*   **System Action:** Detects sparse geometry -> Displays "Low Confidence" warning.
*   **Outcome:** Sarah switches to 2012 (90% coverage) based on system recommendation.

## Functional Capabilities

### Urban Metric Engine
- **FR1:** Users can calculate **Building Density** (Footprint Area / Total Area) within a selected radius.
- **FR2:** Users can calculate **Road Density** (Length / Area) within a selected radius.
- **FR3:** System must perform server-side geometric comparison of OSM Geometry between two selected timepoints.
- **FR4:** System must autocorrect invalid geometries (self-intersecting polygons) before calculation.

### Visualization & UI
- **FR5:** Users can compare two time periods using a **Split-Screen Slider** (Satellite vs. Heatmap).
- **FR6:** Users can toggle between "Building Footprints", "Road Network", and "Ratio View" layers.
- **FR7:** Users can draw a circular boundary (1-3km radius) to define the analysis area.

### Data Export & Management
- **FR8:** Users can download analysis results as a CSV file formatted for R/SPSS.
- **FR9:** Exported files must include a generated **Citation String** (e.g., "Data via Urbanize v1.0...").
- **FR10:** System must cache query results to ensure deterministic outputs for identical requests.

### Admin & Stability
- **FR11:** System must implement a **Token Bucket Queue** (1 req/2s) to manage API rate limits.
- **FR12:** System must provide a "Low Confidence" warning when historical data coverage is below threshold.

## Domain-Specific Requirements

### Academic Rigor
*   **Reproducibility:** All algorithms must be versioned and cited in exports.
*   **Transparency:** Users must have access to raw geometric counts alongside calculated density.

### Geospatial Constraints
*   **Projections:** Area calculations must use equal-area projections (e.g., Albers) to avoid distortion.
*   **Topology:** Robust handling of imperfect historical OSM data.

## Technical Architecture Settings

### Web Application
*   **Type:** Single Page Application (SPA).
*   **Rendering:** WebGL mandatory for map rendering.
*   **Browser Support:** Chrome/Firefox/Edge (Latest 2), Safari (Desktop).

### Integration
*   **Data Ingestion:** Parsers for OSM XML/PBF and GeoJSON.
*   **APIs:** Google Maps (Visuals), Overpass API (Data).

## Non-Functional Requirements

### Performance
*   **Map Interaction:** Tile load < 200ms; Pan/Zoom < 16ms (60fps).
*   **Calculation:** 3km radius historical diff < 30 seconds.
*   **App Load:** LCP < 1.5s on desktop.

### Reliability & Stability
*   **Resilience:** 0% rate-limit bans via strict queuing.
*   **Concurrency:** Support 50 concurrent complex queries.

### Security & Accessibility
*   **Security:** HTTPS (TLS 1.2+); No PII retention.
*   **Accessibility:** WCAG 2.1 AA compliance; Keyboard navigability for maps.

## Innovation & Market
*   **Transparency:** First "Citation-Native" GIS tool exposing formula versions.
*   **Time-Travel:** Novel split-screen overlay of *computed* data layers.
*   **Server-Side Diff:** Moving complex geometry ops to server for accuracy and mobile-friendliness.
