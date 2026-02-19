---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-01-29.md', '_bmad-output/brainstorming/brainstorming-session-2026-02-01.md', '_bmad-output/planning-artifacts/research/technical-urban-parameter-calculation-research-2026-02-12.md']
date: 2026-02-12
author: precisionxxx
project_name: urbanize
status: complete
---

# Product Brief: urbanize

## Success Metrics

### User Success (The Student Researcher)

*   **Data Validity:** The system's "Computed Diff" must match manual ground-truth checks within a **5% error margin** to be viable for academic citation.
*   **Workflow Acceleration:** Reduces the time to "Generate a District Timeline" from **2 weeks** (manual archival research) to **< 5 minutes**.
*   **Export Readiness:** 100% of data exports (CSV/GeoJSON) are formatted directly for import into statistical tools (R/SPSS) without manual cleaning.

### Project Objectives (Academic Goals)

*   **Methodological Acceptance:** The tool's logic (how it calculates "radius" and "density") is transparent enough to be defended in a thesis methodology section.
*   **Publication:** The visualizations and data outputs are high-fidelity enough to be included directly in the final research paper/poster.

### Key Performance Indicators (KPIs)

1.  **Metric:** Processing time for a 3km radius historical diff.
    *   **Target:** < 30 seconds (to allow for iterative hypothesis testing).
2.  **Metric:** Rate Limit Stability.
    *   **Target:** 0 API bans from Google/Overpass during a full batch data collection run.
3.  **Metric:** Historical Data Coverage.
    *   **Target:** Successfully retrieves valid building footprint data for at least 3 distinct time periods (e.g., 2015, 2020, 2025) for the target city.

## MVP Scope

### Core Features (The "Thesis Defender" Build)

1.  **Urban Metric Engine:**
    *   Calculates **Building Density** (Footprint Area / Total Area) and **Road Density** (Length / Area) within a user-drawn circle (1km - 3km).
    *   *Constraint:* processing limited to < 30s per query.
2.  **Historical "Computed Diff":**
    *   Server-side comparison of OSM Geometry from **Time A** vs **Time B**.
    *   Outputs a "Change Delta" (e.g., "+15% Building Density").
3.  **Visual Evidence Layer:**
    *   **Dual-Map Slider:** A "Swipe" UI overlaying Satellite imagery from Google Maps (Visual Context) vs. computed Heatmaps (Data Context).
4.  **Research-Grade Export:**
    *   One-click CSV download of all calculated parameters for the selected area and timeframes.

### Out of Scope for MVP (Version 2.0 / Post-Thesis)

*   **Predictive Modeling:** No "Future Simulation" or AI zoning predictions. We only analyze *recorded history*.
*   **Live Traffic Integration:** No real-time sensor API integration. We will use historical "Traffic Volume" averages if available, or proxy it via road hierarchy.
*   **Mobile Support:** Desktop Web only (Researcher workflow).
*   **Global Search:** Application restricted to **5 Pre-indexed Cities** to ensure data quality and height availability.

### MVP Success Criteria

*   **The "Thesis Test":** Can the user generate a valid "Density vs. Traffic" correlation graph for a single district in < 10 minutes?
*   **System Stability:** The Node.js proxy handles 50 concurrent historical queries without crashing or getting rate-limited.

### Future Vision

*   **Year 2:** "Sim-City" mode where users can draw *new* buildings and see projected traffic impacts.
*   **Year 3:** Global rollout with "Community Data Contribution" for unmapped areas.

<!-- Content will be appended sequentially through collaborative workflow steps -->
