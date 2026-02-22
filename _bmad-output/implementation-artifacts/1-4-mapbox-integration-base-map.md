# Story 1.4: Mapbox Integration & Base Map

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to see a map on the dashboard,
so that I can begin my spatial analysis.

## Acceptance Criteria

1. **Given** I am logged in
   **When** I visit `/map`
   **Then** I see a full-screen interactive map
2. **And** the base map style is set to Satellite (or can be toggled)
3. **And** I can pan and zoom the map
4. **And** the Mapbox API key is securely loaded from environment variables

## Tasks / Subtasks

- [x] Install Mapbox Dependencies
  - [x] `npm install mapbox-gl react-map-gl`
  - [x] `npm install -D @types/mapbox-gl` (Types may be necessary for `mapbox-gl`)
  - [x] Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local` and `.env.example`
- [x] Configure Map Component
  - [x] Create `src/features/map/components/base-map.tsx`
  - [x] Ensure the component has `'use client'` directive
  - [x] Import Mapbox CSS: `import 'mapbox-gl/dist/mapbox-gl.css';`
  - [x] Set up `<Map>` component from `react-map-gl` with Mapbox token, default viewport, and `mapStyle="mapbox://styles/mapbox/satellite-v9"`
- [x] Integrate Map into Dashboard
  - [x] Update `src/app/(dashboard)/map/page.tsx` to render `<BaseMap />`
  - [x] Ensure map container takes full screen height and width relative to its parent container. Make sure the overall layout prevents scrollbars if not intended.

## Dev Notes

### Architecture Compliance — MANDATORY

- **Map Library:** Use `mapbox-gl` and `react-map-gl`. Do not use Leaflet for this project.
- **Client Components:** Any component using `react-map-gl` MUST have the `'use client'` directive since Mapbox GL JS relies on browser APIs (WebGL, Window).
- **Styling:** Use Tailwind CSS for the container sizing.
- **Project Structure:** Follow the architecture's feature-based structure: create map components in `src/features/map/components/`.

### Technical Stack

| Concern | Technology | Version |
|---|---|---|
| Map SDK | `mapbox-gl` | latest |
| React Wrapper | `react-map-gl` | `^7.x` |
| Styling | `Tailwind CSS` | `^3.x` |

### Environment Variables

```bash
# Add to .env.local
NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_MAPBOX_TOKEN
```

### Code Patterns — Follow Exactly

**`src/features/map/components/base-map.tsx`:**
```tsx
'use client';

import * as React from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function BaseMap() {
  return (
    <div className="h-full w-full">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -0.1276, // Default to London (per PRD city focus)
          latitude: 51.5072,
          zoom: 10
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
      />
    </div>
  );
}
```

**`src/app/(dashboard)/map/page.tsx`:**
```tsx
import { auth } from '@clerk/nextjs/server';
import { BaseMap } from '@/features/map/components/base-map';

export default async function MapPage() {
  const { userId } = await auth();

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] w-full flex-col">
      {/* Subtracting spacing.16 as a placeholder for potential header height */}
      <main className="flex-1 relative">
         <BaseMap />
      </main>
    </div>
  );
}
```

### Project Structure Notes

**Files to create/modify in this story:**
```
urbanize/
├── src/
│   ├── features/
│   │   └── map/
│   │       └── components/
│   │           └── base-map.tsx       # [NEW]
│   ├── app/
│   │   └── (dashboard)/
│   │       └── map/
│   │           └── page.tsx           # [MODIFY] Render <BaseMap />
├── .env.example                       # [MODIFY] Add NEXT_PUBLIC_MAPBOX_TOKEN
└── .env.local                         # [MODIFY] Add real Mapbox token
```

### Previous Story Intelligence

- Story 1.3 verified Clerk auth on `/map`. The `userId` is printed there. We will replace this stub with the full-screen map.

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

- Validated Mapbox Next.js App Router patterns, ensuring `react-map-gl` usages contain the `'use client'` directive to prevent SSR errors caused by browser-only API invocations in Mapbox GL JS. 

### Completion Notes List

- Compiled comprehensive story utilizing extracted requirements from architecture specifications and the PRD.
- Highlighted the need for the `use client` boundary.
- Incorporated explicit directory layouts and file definitions.
- ✅ Implemented BaseMap component using `react-map-gl@^7.x` and integrated it into the full-screen dashboard page.
- ✅ Successfully ran TypeScript and ESLint checks.
- ✅ Fixed AI review findings: Added missing mapbox token error boundary, converted vh to dvh for mobile responsiveness, and moved the mapbox CSS import to the root layout.

### File List

- `src/features/map/components/base-map.tsx` (NEW)
- `src/app/(dashboard)/map/page.tsx` (MODIFIED)
- `src/app/layout.tsx` (MODIFIED)
- `.env.local` (MODIFIED)
- `.env.example` (MODIFIED)
- `package.json` (MODIFIED)

### Change Log
- Implemented story 1.4: added full-screen interactive Mapbox integration via `react-map-gl` on `/map`.
- Addressed code review feedback: Added error boundary for missing Mapbox API keys, fixed responsive height issues, and corrected Mapbox CSS styling imports.
