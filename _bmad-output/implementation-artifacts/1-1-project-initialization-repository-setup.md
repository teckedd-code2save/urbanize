# Story 1.1: Project Initialization & Repository Setup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to initialize the Next.js Monolith with the specified stack (TypeScript, Tailwind, shadcn/ui),
so that the team has a consistent codebase to work from.

## Acceptance Criteria

1.  **Given** the implementation environment
    **When** I run the initialization commands
    **Then** a Next.js 16+ app (App Router) is created with TypeScript, Tailwind, and ESLint configured
2.  **And** `npx shadcn-ui@latest init` has been run successfully with the correct config (New York style, Slate base color)
3.  **And** `package.json` contains all required dependencies (`next`, `react`, `react-dom`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)
4.  **And** the project directory structure includes a mandatory `src/` directory
5.  **And** `npm run dev` starts the application on localhost:3000 without errors

## Tasks / Subtasks

- [x] Initialize Next.js Project (AC: 1, 4)
  - [x] Run `npx create-next-app@latest . --typescript --tailwind --eslint --src-dir` at project root
  - [x] Verify `next.config.mjs` is present
- [x] Initialize shadcn/ui (AC: 2)
  - [x] Run `npx shadcn-ui@latest init`
  - [x] Select "New York" style
  - [x] Select "Slate" as base color
  - [x] Configure CSS variables for colors
- [x] Install Core Dependencies (AC: 3)
  - [x] Ensure `lucide-react` is installed
  - [x] Ensure `class-variance-authority`, `clsx`, `tailwind-merge` are installed (usually via shadcn init)
- [x] Configure Visual Standards (AC: 2)
  - [x] Install fonts `Inter` and `JetBrains Mono` via `next/font`
  - [x] Update `tailwind.config.ts` to use these fonts
- [x] Verify Application Start (AC: 5)
  - [x] Run `npm run dev`
  - [x] Check console for errors
  - [x] Verify landing page loads

## Dev Notes

### Architecture Compliance

- **Framework:** Next.js 16 (App Router) is MANDATORY. Do not use Pages router.
- **Language:** TypeScript 5.x+ is MANDATORY. No `.js` files for source code.
- **Styling:** Tailwind CSS is the ONLY styling engine. No CSS modules or SASS/LESS.
- **Component Library:** shadcn/ui is the standard. Do not install other UI libraries like MUI or AntD.
- **Directory Structure:** All source code MUST be in `src/`. `app/` must be inside `src/`.

### Technical Requirements

- **Fonts:**
  - Sans: Inter (Variable font recommended)
  - Mono: JetBrains Mono
- **Colors (Tailwind Config):**
  - Primary: Blue (`sky-500`) - *Note: Default shadcn might use black/slate, override css variables if needed to match Brand guidelines* -> *Actually, sticking to shadcn Slate default for now is fine, customization can happen in a later UX polish story, but `sky-500` is noted in Architecture. Let's configure it if easy, otherwise standard Slate is acceptable for initialization.*
  - **Correction:** Architecture specifices `sky-500` for Primary. Update `globals.css` CSS variables or `tailwind.config.ts` to map `primary` to `sky-500`.

### Project Structure Notes

- Ensure `.gitignore` is properly configured for a Next.js project.
- Ensure `README.md` is preserved or updated (don't overwrite the main project readme blindly if it contains important info, but for a new init it might be standard).

### References

- [Architecture: Starter Template](_bmad-output/planning-artifacts/architecture.md#starter-template-evaluation)
- [UX Design: Design System Foundation](_bmad-output/planning-artifacts/ux-design-specification.md#design-system-foundation)
- [Epic 1: System Foundation](_bmad-output/planning-artifacts/epics.md#epic-1-system-foundation--access)

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

N/A

### Completion Notes List

- Initialized Next.js App Router project with TypeScript, ESLint, and Tailwind CSS.
- Initialized shadcn with Slate coloring and CSS variable support.
- Configured Inter and JetBrains Mono fonts in `src/app/layout.tsx` and `src/app/globals.css`.
- Successfully started Next.js dev server on port 3000 and verified HTTP 200 response.
- ✅ Resolved review finding [High]: Updated `--primary` CSS variable to sky-500 OKLCH value (`oklch(0.623 0.194 233)`) in `globals.css`.
- ✅ Resolved review finding [High]: Updated metadata title/description from boilerplate to "Urbanize – Urban Parameter Calculator".
- ✅ Resolved review finding [Medium]: Fixed package name from `urbanize-temp` to `urbanize` in `package.json`.
- ✅ Resolved review finding [Medium]: Replaced boilerplate metadata with project-appropriate title and description in `layout.tsx`.
- ✅ Resolved review finding [Medium]: Ran `git init` and committed initial project state.

### File List

- `components.json`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `postcss.config.mjs`
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`
- `src/app/favicon.ico`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/lib/utils.ts`
- `tsconfig.json`

### Change Log

- (2026-02-19) Addressed code review findings – 5 items resolved: sky-500 primary color, metadata, package name, and git init.
