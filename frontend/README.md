# ICEPac frontend

React + TypeScript + MUI, built with Vite.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Type-check, then production build into `build/` |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright, API mocked) |
| `npm run verify` | The full gate: typecheck, lint, style budget, unit, build, e2e |

Copy `.env.example` to `.env` to point the app at a different API (`VITE_API_URL`).
