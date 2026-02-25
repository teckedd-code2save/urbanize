# Story 2.1: City Search & Map Positioning

Status: done

### Tasks/Subtasks

- [ ] [AI-Review][Medium] Implement test coverage for CitySearch component (deferred per project framework initialization)

### Dev Agent Record

#### Agent Model Used

Antigravity (Guided workflow execution)

#### Completion Notes List

- Implemented `CitySearch` UI using shadcn/ui React components (`Command`, `Popover`, `Button`).
- Integrated `MapProvider` from `react-map-gl` in `BaseMap` to allow nested components to imperatively manipulate map view state.
- Created `SUPPORTED_CITIES` static configuration defining London, NYC, and Singapore with optimal `zoom: 11`.
- Setup a flyTo animation lasting 2000ms upon selecting a city from the list.
- Successfully compiled via TypeScript and linted. Testing framework initialization deferred to `testarch-framework` (or TEA *automate) per BMad best practice, since no `vitest` or `playwright` dependencies were found.
- [AI-Review] Fixed UI overlap between CitySearch and User tag.
- [AI-Review] Updated BaseMap initial zoom level to 11 to match constants.
- [AI-Review] Fixed Layout-level auth redirect logic.

#### File List

- `src/features/map/constants.ts` (NEW)
- `src/features/map/components/city-search.tsx` (NEW)
- `src/features/map/components/base-map.tsx` (MODIFY)
- `src/app/(dashboard)/layout.tsx` (MODIFY)
- `src/app/(dashboard)/map/page.tsx` (MODIFY)
- `package.json` (MODIFY)
- `components.json` (MODIFY)
- `src/components/ui/*` (NEW, Shadcn elements: button, command, dialog, popover)
