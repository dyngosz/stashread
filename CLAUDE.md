# StashRead - Claude Code Instructions

## Project
StashRead is a Firefox extension for saving articles to read later with EPUB generation for Kindle.

## Tech Stack
- WXT framework (wxt.dev) with Svelte 5
- TypeScript strict mode
- Tailwind CSS v4 (configured via @tailwindcss/vite — no tailwind.config.ts)
- browser.storage.local for all data persistence
- @mozilla/readability for article extraction (Phase 3)
- JSZip for EPUB generation (Phase 3)

## Key Conventions
- All storage operations go through src/lib/storage.ts — never call browser.storage directly from components
- All types defined in src/lib/models.ts
- Shared components live in src/components/; entrypoint-specific components live within their entrypoint directory
- Use `browser.*` API (not `chrome.*`) — WXT handles the polyfill
- Every async operation must have try/catch with user-visible error feedback
- No external network calls except loading article URLs for content extraction
- Use Svelte 5 runes: $props(), $state(), $derived(), $effect() — not Svelte 4 reactive syntax

## File Organization
- src/entrypoints/ — background.ts, popup/, sidebar/, content.ts
- src/lib/ — storage.ts, models.ts, epub.ts, readability.ts, import-export.ts, utils.ts
- src/components/ — shared Svelte components
- src/assets/ — icons (SVG source), styles (global.css)
- public/icons/ — generated PNG icons (committed, regenerate with npm run generate-icons)

## Testing
- Unit tests for all src/lib/ modules
- Test files co-located: storage.test.ts next to storage.ts
- Run: npm run test

## Commands
- npm run dev — Development with HMR (opens Firefox)
- npm run build — Production build
- npm run zip — Package for AMO
- npm run test — Unit tests
- npm run test:watch — Watch mode
- npm run test:coverage — Coverage report
- npm run check — Svelte type checking
- npm run generate-icons — Regenerate PNG icons from src/assets/icons/icon.svg
