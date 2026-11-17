# ICEPac frontend

The ICEPac web app, branded for Adalex Consulting: React 19, TypeScript, MUI 7, TanStack Query, React Router 7, built with Vite. It talks to the FastAPI backend in the repository root.

Design decisions and the phase-by-phase build are in [`../UI_MODERNIZATION_PLAN.md`](../UI_MODERNIZATION_PLAN.md).

## Prerequisites

- Node.js 22 (the version CI and the Dockerfile use) and npm.
- For real data: the backend running (see the root [README](../README.md), `make run`, API on http://localhost:8000). You do not need it for the unit or e2e tests, which mock the API.
- For e2e: a Chromium that Playwright can find. CI runs `npx playwright install --with-deps chromium`; on a machine that already has the pinned browser, nothing to do.

## Getting started

```bash
cd frontend
npm ci                 # install exactly what package-lock.json says
cp .env.example .env   # optional, see "Environment variables"
npm run dev            # http://localhost:3000
```

Point the dev server at a different backend with the `VITE_API_URL` variable:

```bash
VITE_API_URL=http://localhost:8000/api/v1 npm run dev
```

The backend must list `http://localhost:3000` in its allowed origins (`ALLOWED_ORIGINS`).

## Environment variables

Read at build time by Vite (they are baked into the bundle). Defaults are in `.env.example`.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Base URL of the backend API |
| `VITE_CURRENCY` | `AUD` | ISO currency code used by `formatCurrency` |
| `VITE_LOCALE` | `en-AU` | Locale used for numbers and dates |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` (or `npm start`) | Vite dev server on http://localhost:3000 |
| `npm run build` | Type-check, then production build into `build/` |
| `npm run preview` | Serve `build/` locally (what the e2e tests run against) |
| `npm test` | Unit tests (Vitest, jsdom) once; `npm run test:watch` re-runs on change |
| `npm run typecheck` | `tsc` for `src/` and for `e2e/` |
| `npm run lint` | ESLint with zero warnings allowed; `no-explicit-any` is an error |
| `npm run style-budget` | Counts inline `style={{}}`, hex colours and emoji in `src/` against `style-budget.json` (all 0) |
| `npm run bundle-budget` | After a build: gzipped size of the JavaScript loaded on first visit must be under 350 kB, and the data grid and charts must not be in it |
| `npm run e2e` | Playwright end-to-end tests with the API mocked, on a desktop (1440px) and a mobile (390px) project |
| `npm run verify` | **The gate.** Runs, in order: `typecheck`, `lint`, `style-budget`, `test`, `build`, `bundle-budget`, `e2e`. CI runs exactly this. |

`npm run verify` takes six to seven minutes, most of it e2e. Run it before opening a pull request.

### Playwright

`npm run e2e` builds the app and starts `vite preview` on port 3000 (or the port in `PW_PORT`). If something already listens on 3000, set another port so Playwright starts its own server instead of reusing it:

```bash
PW_PORT=3230 npm run verify
PW_PORT=3230 npx playwright test e2e/polish.spec.ts --project=desktop   # one spec, one viewport
PW_PORT=3230 npx playwright test -g "focus ring"                         # by test name
```

`PW_WORKERS` sets the number of parallel workers (default 4, or 2 on CI). The HTML report is written to `playwright-report/`.

## Project layout

```
src/
  api/          axios client, one module per backend area, query option helpers, optimistic-update helpers
  app/          providers, query client (global error toast), routes (every page is lazy loaded)
  auth/         token storage, AuthContext, RequireAuth / RequireRole
  components/
    brand/      BrandMark and the Adalex logo
    common/     shared building blocks (PageHeader, DataTable, StatCard, StatusChip, EmptyState, ErrorState, ...)
    feedback/   ToastProvider and the toast bus
    layout/     AppLayout, Sidebar, Header, breadcrumbs, command palette, skip link, global progress bar
    estimation/, project/, reports/   feature components
  pages/        one file per route; pages/admin/ for the admin screens
  theme/        tokens.ts (brand colours, radius, layout, motion), components.ts (MUI overrides), index.ts
  utils/        formatters (formatCurrency, formatDate, ...)
e2e/            Playwright specs, fixtures/ (mock API) and the generated __screenshots__/
scripts/        style-budget.mjs, bundle-budget.mjs
public/         brand/ logos, favicon.ico, PWA icons, manifest.json
```

## Theme and brand rules

All colours come from `src/theme/tokens.ts` and the MUI theme. Never write a hex colour or an inline `style={{}}` in `src/` outside `src/theme/` (the style budget fails the build); use `sx` with theme keys such as `'text.secondary'`, `'divider'`, `'primary.main'`.

| Token | Hex | Use |
|---|---|---|
| `navy` | `#153351` | Headings, primary buttons (light mode), focus ring on light surfaces |
| `navyDeep` | `#0A1928` | Sidebar, dark-mode page background, text on gold |
| `gold` | `#C4A46F` | The single key action per screen (`color="secondary" variant="contained"`), active-nav marker, focus ring on dark surfaces. Never gold text on a light background |
| `slate` | `#596872` | Body text (light mode) |
| `mist` / `line` | `#F5F7F9` / `#DCE3E8` | Page background / borders |

- Light mode: mist page, white cards with a 1px `line` border and no shadow, navy headings. Dark mode (follows the system, toggle in the header): navy-deep page, `#10263D` cards, gold primary buttons.
- The sidebar is dark in both modes and uses the white logo; the blue logo is for light surfaces only. Do not recolour or stretch logos (`public/brand/`).
- Typeface Plus Jakarta Sans (self-hosted through `@fontsource-variable`).
- 8px radius on cards, inputs and buttons; pill chips. Money is right-aligned with `formatCurrency` and the `tabular-nums` class.
- Charts use the palette from `useChartPalette` and always have a legend or labels.
- Motion: 120 ms hover transitions on `background-color`, `border-color` and `transform` only (set once in the theme), a 200 ms fade between routes, and everything is switched off by `prefers-reduced-motion`.
- Focus: every focusable element gets a 2px `:focus-visible` ring (navy on light, gold in dark mode and inside the sidebar). There is a "Skip to content" link as the first tab stop.
- No emoji as icons; use `@mui/icons-material`.

## Data conventions

- Fetch with `useQuery`, write with `useMutation`; the global query client (`src/app/queryClient.ts`) raises the error toast, so do not add a second one in a component. Mark a query `meta: { silent: true }` to suppress that toast and `meta: { background: true }` for polling so the loading bar under the header ignores it.
- Paginated lists use server `skip`/`limit` with `placeholderData: keepPreviousData` so tables never blank between pages.
- Optimistic updates use `applyOptimistic` / `rollbackOptimistic` from `src/api/optimistic.ts` (see `ApprovalWorkflow`).

## Adding a screen

This is the conversion recipe from section 9.1 of the plan, condensed.

1. Read the page's API calls and check each against the backend route in `app/routes/*.py`. Do not call endpoints that do not exist.
2. Add the API module under `src/api/`, then fetch with `useQuery`. Writes use `useMutation` that invalidates the list key and calls `useToast().success(...)`. No mock data in `src/`.
3. Add the page in `src/pages/`, register it as `React.lazy` in `src/app/routes.tsx`, and add a nav entry in `src/components/layout/navConfig.tsx` if it belongs in the sidebar.
4. Structure: `PageHeader` (title, subtitle, primary action as a gold `color="secondary" variant="contained"` button), a toolbar row (`SearchField`, filters), then the content in a `Card`.
5. Tables use `DataTable` with server pagination where the endpoint takes `skip`/`limit`; money columns right-aligned with `formatCurrency`; dates with `formatDate`; row actions as icon buttons with a tooltip and `aria-label`.
6. Three states, always: loading (`TableSkeleton` / `CardSkeleton`), empty (`EmptyState` with a call to action), error (`ErrorState` with Retry calling `refetch`).
7. Dialogs use `FormDialog` / `ConfirmDialog` (focus returns to the trigger on close). Forms validate required fields and show helper text; the submit button shows a spinner while saving. Destructive actions go through `ConfirmDialog`.
8. No inline `style`, hex colour or emoji. Run `npm run style-budget`.
9. Add an e2e spec (see below) and add the route to the list in `e2e/gate.spec.ts`, which checks every route in light and dark for axe violations, horizontal scroll and console errors.

## Testing conventions

- **Unit tests** (`*.test.ts(x)` next to the code, Vitest and Testing Library): any non-trivial logic, mappers, hooks and shared components. Use `renderWithProviders` from `src/test/renderWithProviders.tsx`.
- **e2e** (`e2e/*.spec.ts`, Playwright): the backend is never called. `mockApi(page, extra?)` in `e2e/fixtures/mockApi.ts` answers every area's default routes from JSON in `e2e/fixtures/data/`; pass `extra` to override or add routes (`'GET /projects': () => ...`). A request with no mock gets a 404 and is recorded, so each spec asserts `api.unmatched` is empty in an `afterEach`. `loginAs(page, 'admin')` seeds a fake token.
- Every screen spec covers: renders from fixtures; empty list; a 500 (error state and toast); each create, edit or delete asserting the request method, URL and body with `page.waitForRequest` plus the toast; `document.documentElement.scrollWidth <= window.innerWidth`; an axe scan in light and dark (`localStorage['mui-mode'] = 'light' | 'dark'` through `addInitScript`) with no serious or critical violations.
- **Screenshots**: `saveScreenshot(page, testInfo, '<phase>', '<name>')` writes `e2e/__screenshots__/<phase>/<name>-<project>.png`. They are git-ignored review artefacts, not pixel gates. `e2e/gate.spec.ts` writes one per route, per colour mode, per viewport to `e2e/__screenshots__/phase-4-final/`; CI uploads the folder as the `ui-screenshots` artefact (`gh run download <run-id> -n ui-screenshots`). Open the pictures after any visual change.
- Do not weaken a check (lint rule, budget, assertion) to get green; fix the cause.

## Docker

`docker compose up` from the repository root builds this folder with the `Dockerfile` and serves the dev server on port 3000 with `VITE_API_URL=http://localhost:8000/api/v1`.
