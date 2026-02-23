# Story 2.2: Circle Drawing Interaction

Status: done

## Story Requirements

**Epic 2: Area Selection & Data Retrieval**  
*Goal: Enables users to precisely define their study area (Circle Drawing) and reliably retrieve historical urban data without hitting API limits.*

**User Story:**  
As a Researcher,  
I want to draw a circular boundary on the map,  
So that I can precisely define the area for density calculation.

**Acceptance Criteria:**  
- [x] **Given** I am in "Draw Mode"
- [x] **When** I click and drag on the map
- [x] **Then** a circle is drawn visually
- [x] **And** a real-time radius label (e.g., "1.5 km") is displayed as I drag
- [x] **And** the tool prevents drawing > 3km radius (shows visual warning)
- [x] **And** I can clear or redraw the selection

## Developer Context

### Technical Requirements
- Implement the circle drawing interaction using map pointer events (`mousedown`, `mousemove`, `mouseup`) from `react-map-gl` since standard Mapbox GL Draw does not natively support an effortless "click center, drag radius" gesture perfectly out of the box.
- Use **Turf.js** (specifically `@turf/circle` and `@turf/distance`) to calculate the GeoJSON polygon representing the circle on the fly during the drag operation.
- Integrate the visual output using Mapbox `Source` (geojson) and `Layer` (fill and line) components from `react-map-gl`.
- Maintain a `drawingState` (idle, drawing, drawn) in the client.

### Architecture Compliance
- Place map components in `src/features/map/components/`.
- Manage client-side state via React state or Zustand (`src/features/map/hooks/use-map-store.ts`) if cross-component state is needed (e.g., enabling draw mode from a toolbar outside the map).
- "Heavy Math" rule: Turf.js usage here is strictly for lightweight client-side interactions (calculating the circle's GeoJSON to render it). It is NOT to be used for complex building density math.

### UX & Interface Requirements
- **Interaction Pattern:** The interaction must feel like "Precision without Complexity". No multi-step wizards or complex polygon tools.
- **Visual Feedback:** 
  - Show a real-time radius measurement as the user drags (e.g., "Radius: 2.3 km").
  - If the user drags beyond 3km, visually constrain the radius drawn to 3km and show a warning (e.g., turning the radius label text amber/orange based on Tailwind palette).
- **Forgiveness:** Users should be able to clear or easily redraw the circle without friction.

### Previous Intelligence & Gotchas
- **Map Context Ref Issue:** In Story 1.4/2.1, there was an issue referencing the map instance. Ensure you use the ID `main-map` when calling `useMap()` (e.g., `const { 'main-map': map } = useMap()`).
- **Dependencies:** Verify that turf modules (`@turf/circle`, `@turf/distance`) are installed or install them. Ensure they don't break the build with typing issues.

### Tasks/Subtasks
- [x] Install required Turf.js dependencies (`@turf/circle`, `@turf/distance`, `@turf/helpers`).
- [x] Create `CircleDrawer` component in `src/features/map/components/` that hooks into the map's drag events.
- [x] Implement state management to distinguish between map panning and circle drawing mode.
- [x] Add visual feedback layers (GeoJSON shape) and distance tooltip.
- [x] Add a clean UI control to toggle Draw Mode or Clear the drawing.

## Dev Agent Record
### Completion Notes
- Integrated Turf.js bindings for radius limits and boundary calculation.
- Added `CircleDrawer` and `DrawControl` mapped efficiently to map hooks without excessive global state.
- Handled Mapbox interaction (`dragPan.disable()`) accurately during `drawing` state.
- Verified components build and compile successfully via `npm run build`.

## File List
- src/features/map/components/base-map.tsx
- src/features/map/components/circle-drawer.tsx
- src/features/map/components/draw-control.tsx
- src/features/map/constants.ts
- src/components/ui/button.tsx
- src/components/ui/command.tsx
- src/components/ui/dialog.tsx
- src/components/ui/popover.tsx
- src/app/(dashboard)/map/page.tsx
- package.json
- package-lock.json

## Change Log
- Implemented drawing interaction capping circle distance to 3km.
- Displayed custom distance tooltip dynamically with tailwind-styled warnings.

## Code Review Fixes (2026-02-22)
- **H1**: Warning label now persists in `drawn` state when radius equals MAX limit, so cap enforcement is always visible.
- **H2**: `handleToggleDraw` now resets `circleCenter`/`circleRadiusKm` when entering draw mode from any non-`drawing` state, preventing stale state on re-draw.
- **M1/M2**: Added all missing files to File List (`constants.ts`, `map/page.tsx`, ui components).
- **M3**: Wrapped `onUpdateCircle` and `onDrawingComplete` in `useCallback` in `base-map.tsx` to prevent event listener churn during drag.
- **M4**: Added `type="button"` and `aria-label` to all `DrawControl` buttons.
- **L1**: Extracted magic number `3` into `MAX_CIRCLE_RADIUS_KM` constant in `constants.ts`.
- **L2**: Removed debug `userId` overlay from `map/page.tsx`.

---
*Task Completion Note: Ultimate context engine analysis completed - comprehensive developer guide created*
