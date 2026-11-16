# ICEPac UI Modernisation Plan

**Status:** ready to execute · **Written:** 2026-11-16 · **Scope:** `frontend/` plus three small backend endpoints
**Audience:** an implementation agent working phase by phase, and Adam as reviewer.

The goal is a dynamic, modern interface in the Adalex Consulting brand, delivered in seven phases that each end in a green, reviewable pull request.

---

## 1. How to use this plan (read first)

1. Work **one phase per branch and pull request**, in order. Branch names: `ui/phase-0-stabilise`, `ui/phase-1-design-system`, and so on. Do not start a phase until the previous one is merged.
2. Inside a phase, do the tasks in ID order (`P2-T3` = phase 2, task 3). Commit after each task with the task ID in the message, for example `feat(ui): P2-T3 breadcrumbs`.
3. A task is done only when every line under its **Accept** heading is true. A phase is done only when the **Phase gate** passes.
4. The **gate command** (defined in P0-T8) is the single source of truth for "green":
   ```bash
   cd frontend && npm run verify
   ```
5. Rules that apply to every task:
   - **Do not change behaviour** unless the task says so. This is a visual and structural upgrade.
   - **Do not invent API endpoints.** Before wiring a screen, open the matching file in `app/routes/` and use only routes that exist there. If a call in `frontend/src/api/` has no backend route, remove the call and note it in the PR description.
   - **Installed types are the source of truth.** If a snippet in this plan disagrees with the TypeScript types in `node_modules` for the installed version, follow the types and note the difference in the PR.
   - **No new colours outside `src/theme/`.** Use theme tokens (`sx={{ color: 'text.secondary' }}`, `theme.palette.*`).
   - **No inline `style={{…}}`** in new or converted code. Use the MUI `sx` prop or `styled()`.
   - **No emoji as icons.** Use `@mui/icons-material`.
   - Do not weaken a check (lint rule, test, style budget) to get green. If a check is wrong, stop and report.
   - If a task cannot be completed as written, stop, leave the branch as is, and write what blocked you in the PR description. Do not improvise around it.
6. Install the **latest stable** version of each new package at the time of install and commit the lockfile. Do not upgrade React, MUI core or React Router major versions.

---

## 2. Verified starting point (measured 2026-11-16, commit `1122c90`)

These were checked by running the code, not assumed.

| Finding | Evidence | Fixed in |
|---|---|---|
| `npm ci` fails: lockfile out of sync (`Missing: yaml@2.9.1`). The frontend Docker image therefore cannot build. | `npm ci` output | P0-T1 |
| Production build fails. 20 TypeScript errors across `SearchBar.tsx`, `RiskForm.tsx`, `ProjectDetail.tsx`, `AuditLogs.tsx`, `ResourceLibrary.tsx`. | `npm run build`, `tsc --noEmit` | P0-T2 |
| Login cannot work: `Login.tsx` posts JSON, but `POST /auth/login` takes an OAuth2 form body. | `app/routes/auth.py` uses `OAuth2PasswordRequestForm` | P0-T3 |
| Two token keys: `api/client.ts` reads `access_token`; `api/admin.ts` reads `auth_token` and uses raw `fetch` against a relative `/api/v1/admin`. | source | P0-T4 |
| All six admin pages and `Reports.tsx` render hardcoded `MOCK_*` data. | `grep -rl MOCK_ src` | Phase 4 |
| `AdminLayout` is nested inside `AppLayout`, so admin pages show two sidebars. | `App.tsx` routes | P2-T2 |
| No route guard. Unauthenticated users reach every page. | `App.tsx` | P2-T5 |
| Zero frontend tests. CI has no frontend job. | no `*.test.*` files; `.github/workflows/ci.yml` | P0-T6, P0-T7, P0-T9 |
| Built on Create React App (`react-scripts` 5, unmaintained) with TypeScript 4.9 and `target: es5`. | `package.json`, `tsconfig.json` | P0-T5 |
| Theme is 22 lines of MUI defaults (`#1976d2`, Roboto). | `src/theme.ts` | Phase 1 |
| 20 files use inline `style=`; 227 hardcoded hex colours in `src/`. | grep | Phases 3–4 |
| Dashboard: "Admin" card spins forever; "System Status" is hardcoded to operational; no charts anywhere. | `pages/Dashboard.tsx` | Phase 5 |
| Currency hardcoded to USD in 5 files. | grep `USD` | P1-T6 |
| No responsive handling (`ml: '240px'` fixed). | `AppLayout.tsx` | P2-T1 |

Backend endpoints that already exist and should be used: `GET /dashboard/stats`, `GET /dashboard/health-detailed`, everything in `app/routes/admin.py`, `project.py`, `estimation.py`, `reports.py`, `help.py`. There is **no** `GET /auth/me`.

---

## 3. Adalex brand specification

Values were read from the computed styles of https://www.adalex.com.au/ on 2026-11-16. Contrast ratios are WCAG 2.1, calculated.

### 3.1 Brand colours (from the site)

| Token | Hex | Where Adalex uses it | Contrast |
|---|---|---|---|
| `navy` | `#153351` | Dark section background, headings | 12.9:1 on white |
| `navyDeep` | `#0A1928` | Hero background | white text 17.8:1 |
| `blue` | `#004773` | Logo, links, nav text | 9.8:1 on white |
| `gold` | `#C4A46F` | Primary call-to-action button, "Delivered." headline, stat figures | 7.5:1 on `navyDeep`; **2.4:1 on white — never use as text on light** |
| `goldDark` | `#A88B5A` | Small gold labels | 3.2:1 on white — large text only |
| `slate` | `#596872` | Body text | 5.8:1 on white |
| `mist` | `#F5F7F9` | Page background | — |
| `line` | `#DCE3E8` | Borders | — |
| `white` | `#FFFFFF` | Cards | — |

Typeface: **Plus Jakarta Sans**, weights 300–700 (headings 700, labels 600, body 400).

### 3.2 Derived colours (not on the Adalex site)

Added because an application needs states the marketing site does not. All pass AA (4.5:1) for text on their intended background.

| Token | Hex | Purpose | Contrast |
|---|---|---|---|
| `goldText` | `#86693A` | Gold-toned text on light backgrounds | 5.1:1 on white |
| `goldLight` | `#D9C49C` | Hover and tint of gold | — |
| `success` | `#1F7A55` | Approved, active | 5.3:1 on white |
| `warning` | `#B45309` | Submitted, pending | 5.0:1 on white |
| `error` | `#B3261E` | Rejected, failed | 6.5:1 on white |
| `darkPaper` | `#10263D` | Card surface in dark mode | — |
| `darkText` | `#E6ECF1` | Text in dark mode | 12.9:1 on `darkPaper` |
| `darkTextMuted` | `#9FB0BF` | Secondary text in dark mode | 6.9:1 on `darkPaper` |
| `darkBlue` | `#7FB8E0` | Links and info in dark mode | 7.2:1 on `darkPaper` |
| `darkSuccess` / `darkWarning` / `darkError` | `#5CC49A` / `#F0B35A` / `#F28B82` | Status in dark mode | ≥ 6.4:1 on `darkPaper` |

### 3.3 Usage rules

- **Light mode:** page `mist`, cards white with a 1px `line` border and no shadow at rest, headings `navy`, body `slate`, primary buttons `navy` with white text.
- **Gold is the accent, used sparingly:** the single most important action on a screen (for example "New Project", "Sign in"), the active item marker in the sidebar, and headline figures on dark surfaces. Gold buttons always carry `navyDeep` text.
- **Sidebar is dark in both modes:** `navyDeep` background, white text at 70% opacity, active item white text with a 3px gold bar on the left.
- **Dark mode:** page `navyDeep`, cards `darkPaper`, primary buttons gold with `navyDeep` text (mirrors the Adalex hero).
- **Charts:** series colours in this order: `#153351`, `#C4A46F`, `#004773`, `#2F7FB3`, `#86693A`, `#5B8A72`, `#8E6C8A`, `#596872`. In dark mode swap the first for `#7FB8E0`. Every chart needs a legend or direct labels; never rely on colour alone.
- **Shape:** 8px radius on cards, inputs and buttons; 999px on chips.
- **Product naming:** the app is "ICEPac"; the brand line is "by Adalex Consulting".

### 3.4 Logo assets (supplied by Adam, committed)

All four files are transparent PNGs in `frontend/public/brand/`. The white and mark-only files were generated from the supplied logo by recolouring and cropping; the artwork itself is unchanged.

| File | Size | Use |
|---|---|---|
| `adalex-logo.png` | 1316×362 | Full logo (blue `#004773` mark, `#3B4B59` wordmark). Light surfaces only: login form panel, light-mode footer. |
| `adalex-logo-white.png` | 1316×362 | Full logo in white. Dark surfaces: sidebar footer, login brand panel. |
| `adalex-mark.png` | 404×404 | Diamond mark only, blue. Favicon source; light surfaces. |
| `adalex-mark-white.png` | 404×404 | Diamond mark only, white. Sidebar header and collapsed rail. |

Rules:
- Never place the blue logo on a navy surface (the blue mark is nearly invisible on `navyDeep`); use the white files there. In dark colour mode always use the white files.
- Do not recolour, stretch, crop or add effects to the logo. Keep clear space of at least half the mark's height on every side. Minimum rendered height of the full logo is 24px.
- Always set `alt="Adalex Consulting"` (or `alt=""` when the name is printed next to it).
- For reference, the brand's own solid backdrop for the white logo is `#224A6E`. It is not used as a UI surface.

---

## 4. Target architecture

### 4.1 Stack

| Concern | Choice | Replaces |
|---|---|---|
| Build | Vite + `@vitejs/plugin-react` | Create React App |
| Language | TypeScript 5.x, `target: ES2020`, `moduleResolution: bundler` | TS 4.9 / es5 |
| UI kit | MUI 7 (already installed) with CSS variables and `colorSchemes` | default theme |
| Font | `@fontsource-variable/plus-jakarta-sans` (self-hosted) | Roboto |
| Tables | `@mui/x-data-grid` (community, MIT) | hand-rolled `components/admin/DataGrid.tsx` |
| Charts | `@mui/x-charts` | none |
| Server state | `@tanstack/react-query` v5 | `useEffect` + `useState` fetching |
| Split panes | `react-resizable-panels` | fixed layout |
| Unit tests | Vitest + Testing Library + jsdom | none |
| End-to-end | Playwright + `@axe-core/playwright`, API mocked with `page.route` | none |
| Lint | ESLint 9 flat config (`typescript-eslint`, `react-hooks`) | CRA preset |

Not adding: a CSS framework, an animation library, a global state library, or a toast library (a small MUI-based provider is specified in P3-T2).

### 4.2 Target folder layout (`frontend/src`)

```
api/            client.ts, auth.ts, admin.ts, dashboard.ts, projects.ts, estimation.ts, reports.ts, help.ts, project-risks.ts
app/            App.tsx, routes.tsx, providers.tsx, queryClient.ts
auth/           AuthContext.tsx, RequireAuth.tsx, token.ts
theme/          tokens.ts, index.ts, components.ts, charts.ts
components/
  brand/        BrandMark.tsx
  common/       PageHeader.tsx, EmptyState.tsx, StatusChip.tsx, StatCard.tsx, DataTable.tsx,
                ConfirmDialog.tsx, FormDialog.tsx, SearchField.tsx, TableSkeleton.tsx,
                CardSkeleton.tsx, ErrorState.tsx, AnimatedNumber.tsx, PertRangeBar.tsx
  feedback/     ToastProvider.tsx
  layout/       AppLayout.tsx, Sidebar.tsx, Header.tsx, Breadcrumbs.tsx, UserMenu.tsx,
                CommandPalette.tsx, ColorModeToggle.tsx, navConfig.tsx
  estimation/   (existing)   project/ (existing)   reports/ (existing)
pages/          (existing structure; pages/admin/AdminLayout.tsx is deleted)
utils/          format.ts
test/           setup.ts, renderWithProviders.tsx
```

`components/admin/` is deleted at the end of Phase 4.

### 4.3 Out of scope

Changing estimation maths, report content, database schema, authentication model (still JWT in `localStorage`), or adding features beyond what each task lists.

---

## 5. Phase 0 — Stabilise and tool up

**Outcome:** the frontend installs, builds, lints and tests cleanly on Vite, login works against the real API, and CI enforces it. No visual change yet.

### P0-T1 Repair the lockfile
- Run `cd frontend && npm install`. Commit the updated `package-lock.json`.
- **Accept:** `rm -rf node_modules && npm ci` exits 0.

### P0-T2 Fix the 20 type errors
Fix exactly these; do not refactor further.

| File | Error | Fix |
|---|---|---|
| `components/admin/SearchBar.tsx:17` | `useRef` needs an argument (React 19 types) | `useRef<ReturnType<typeof setTimeout> \| undefined>(undefined)` |
| `components/estimation/RiskForm.tsx` (lines 92–190) | Legacy `<Grid item xs={…}>` | Replace with `<Grid size={{ xs: 12 }}>` etc. Same for any other `Grid item` in `src/` (`grep -rn "Grid item" src`). |
| `pages/ProjectDetail.tsx:20` | Imports `getResources`, `getSuppliers`, `getConfigItems` that `api/admin.ts` does not export | Use `resourcesApi.list({ is_active: true, limit: 1000 })`, `suppliersApi.list({ is_active: true, limit: 1000 })`, `configApi.listItems(table, { is_active: true })`. Check the max `limit` each route allows in `app/routes/admin.py` and use that. Type the `.map` callbacks; remove the `any`s that caused TS7006. |
| `pages/admin/AuditLogs.tsx:39-40`, `ResourceLibrary.tsx:68` | Spreading a `Set` under `target: es5` | Resolved by the tsconfig change in P0-T5; until then use `Array.from(new Set(...))`. |

- **Accept:** `npx tsc --noEmit` prints nothing and exits 0.

### P0-T3 Fix login
- Create `src/api/auth.ts`:
  ```ts
  import client from './client';
  export interface TokenResponse { access_token: string; refresh_token: string; token_type?: string }
  export async function login(username: string, password: string): Promise<TokenResponse> {
    const body = new URLSearchParams({ username, password });
    const res = await client.post<TokenResponse>('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }
  ```
- `Login.tsx` calls `login()` and stores `access_token` and `refresh_token` in `localStorage` under those exact keys.
- **Accept:** unit test (after P0-T6) asserts the request body is form-encoded `username=…&password=…`; with the backend running, signing in with a seeded user lands on `/`.

### P0-T4 One API client, one token key
- Rewrite `src/api/admin.ts` to use the axios `client` from `api/client.ts` (paths `/admin/users` etc., relative to the base URL). Delete `apiFetch` and the `auth_token` key. Keep every exported name and type so pages still compile.
- Verify each admin call against `app/routes/admin.py`. Known mismatches to remove: `dashboardApi.getStats` (`/admin/dashboard` does not exist — move to `src/api/dashboard.ts` as `getDashboardStats()` → `GET /dashboard/stats` and `getHealth()` → `GET /dashboard/health-detailed`), and `resourcesApi.eocSummary` if no such route exists.
- In `client.ts`, do not redirect to `/login` on a 401 that came from `/auth/login` itself.
- **Accept:** `grep -rn "auth_token\|apiFetch\|fetch(" src` returns nothing; `tsc` clean.

### P0-T5 Migrate Create React App to Vite
1. `npm uninstall react-scripts web-vitals @types/jest`; `npm install -D vite @vitejs/plugin-react typescript@5 @types/node@22`.
2. Move `public/index.html` to `frontend/index.html`. Remove every `%PUBLIC_URL%`, set `<title>ICEPac</title>`, `<meta name="theme-color" content="#153351">`, a real description, and add `<script type="module" src="/src/index.tsx"></script>` before `</body>`.
3. Create `vite.config.ts`:
   ```ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   export default defineConfig({
     plugins: [react()],
     server: { port: 3000, host: true },
     preview: { port: 3000 },
     build: { outDir: 'build', sourcemap: true },
     test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', css: false, exclude: ['e2e/**', 'node_modules/**'] },
   });
   ```
   Port 3000 is kept because the backend CORS allow-list contains `http://localhost:3000`.
4. `tsconfig.json`: `"target": "ES2020"`, `"lib": ["ES2020","DOM","DOM.Iterable"]`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"types": ["vite/client","vitest/globals"]`, keep `"strict": true`, `"jsx": "react-jsx"`, `"noEmit": true`. Add `src/vite-env.d.ts` with `/// <reference types="vite/client" />`.
5. Env var: `process.env.REACT_APP_API_URL` → `import.meta.env.VITE_API_URL`. Update `docker-compose.yml` (`VITE_API_URL=…`) and add `frontend/.env.example`.
6. `package.json` scripts: `"dev": "vite"`, `"start": "vite"`, `"build": "tsc --noEmit && vite build"`, `"preview": "vite preview"`. Remove the `eslintConfig` and `browserslist` blocks.
7. `frontend/Dockerfile`: `CMD ["npm", "run", "dev"]`.
8. Delete `src/index.ts` (stale admin barrel that collides with `index.tsx`), `public/logo192.png`, `public/logo512.png`; update `manifest.json` name to "ICEPac" and remove the deleted icons.
- **Accept:** `npm run build` exits 0 and writes `build/index.html`; `npm run dev` serves the app on port 3000; `grep -rn "REACT_APP\|react-scripts\|%PUBLIC_URL%" . --exclude-dir=node_modules` returns nothing.

### P0-T6 Unit test harness
- `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event` (upgrade the existing Testing Library packages).
- `src/test/setup.ts`: `import '@testing-library/jest-dom/vitest';`
- `src/test/renderWithProviders.tsx`: wraps children in `ThemeProvider`, `MemoryRouter` and (from Phase 3) `QueryClientProvider` + `ToastProvider`.
- Write the first tests: `api/auth.test.ts` (form-encoded login, mock axios with `vi.mock`), `pages/Login.test.tsx` (shows "Invalid credentials" on rejection), `pages/NotFound.test.tsx`.
- Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- **Accept:** `npm test` runs ≥ 3 test files, all pass.

### P0-T7 End-to-end harness with a mocked API
- `npm install -D @playwright/test @axe-core/playwright`. Install the browser with `npx playwright install chromium` only if Playwright reports it missing.
- `playwright.config.ts`: `testDir: 'e2e'`, `webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 180_000 }`, `use: { baseURL: 'http://localhost:3000' }`, two projects: `desktop` (1440×900) and `mobile` (390×844).
- `e2e/fixtures/mockApi.ts`: an exported `mockApi(page)` that calls `page.route('**/api/v1/**', …)` and answers from JSON files in `e2e/fixtures/data/`. Unmatched routes must respond 404 **and fail the test** (collect them and assert the list is empty in an `afterEach`), so missing mocks are never silent. Provide `loginAs(page, role)` which sets a fake JWT (unsigned, with `sub`, `role`, far-future `exp`) in `localStorage` via `page.addInitScript`.
- Fixture data: copy field names from the Pydantic response models in `app/models/schemas/`; do not guess shapes.
- First spec `e2e/smoke.spec.ts`: login page renders; after `loginAs`, `/` shows the heading "Dashboard"; `/projects` lists the two fixture projects.
- Each spec ends by saving a full-page screenshot to `e2e/__screenshots__/<phase>/<name>-<project>.png`. Screenshots are **review artefacts, not pixel-diff gates**. Add `e2e/__screenshots__/` to `.gitignore`.
- Script: `"e2e": "playwright test"`.
- **Accept:** `npm run e2e` passes on both projects.

### P0-T8 Lint, style budget and the gate command
- ESLint 9 flat config `eslint.config.js` with `@eslint/js`, `typescript-eslint` (recommended), `eslint-plugin-react-hooks` (recommended). Script `"lint": "eslint src e2e --max-warnings 0"`. Fix or, for pre-existing `any` usage only, downgrade `@typescript-eslint/no-explicit-any` to `off` with a `// TODO(ui-phase-4)` comment in the config. No other rule may be disabled.
- Create `scripts/style-budget.mjs`: walks `src/**/*.{ts,tsx}` excluding `src/theme/**` and `**/*.test.*`; counts (a) matches of `/style=\{/g`, (b) matches of `/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g`, (c) matches of `/\p{Extended_Pictographic}/gu`. Reads `style-budget.json` (`{ "inlineStyle": n, "hex": n, "emoji": n }`); exits 1 if any count **exceeds** its budget; prints the three counts. With `--write` it stores current counts.
- Run `node scripts/style-budget.mjs --write` once and commit `style-budget.json` as the baseline. From now on the budget may only go **down**: at the end of each phase run `--write` and confirm no number rose.
- Scripts: `"style-budget": "node scripts/style-budget.mjs"`, `"typecheck": "tsc --noEmit"`, and the gate:
  `"verify": "npm run typecheck && npm run lint && npm run style-budget && npm test && npm run build && npm run e2e"`
- **Accept:** `npm run verify` exits 0.

### P0-T9 CI job for the frontend
Add to `.github/workflows/ci.yml` a `frontend` job: `ubuntu-latest`, `actions/checkout`, `actions/setup-node` (Node 22, npm cache on `frontend/package-lock.json`), `working-directory: frontend`, steps `npm ci`, `npx playwright install --with-deps chromium`, `npm run verify`; upload `frontend/e2e/__screenshots__` and `frontend/playwright-report` as artefacts with `if: always()`.
- **Accept:** the `frontend` job is green on the PR, alongside the existing three jobs.

**Phase 0 gate:** `npm run verify` green locally and in CI; `docker compose build frontend` succeeds.

---

## 6. Phase 1 — Design system

**Outcome:** every MUI-based screen picks up the Adalex look, with a working light/dark switch at the theme level.

### P1-T1 Tokens
Create `src/theme/tokens.ts` — the **only** file allowed to contain brand hex values (plus `charts.ts`):
```ts
export const brand = {
  navy: '#153351', navyDeep: '#0A1928', blue: '#004773',
  gold: '#C4A46F', goldDark: '#A88B5A', goldText: '#86693A', goldLight: '#D9C49C',
  slate: '#596872', mist: '#F5F7F9', line: '#DCE3E8', white: '#FFFFFF',
} as const;
export const status = {
  light: { success: '#1F7A55', warning: '#B45309', error: '#B3261E', info: '#004773' },
  dark:  { success: '#5CC49A', warning: '#F0B35A', error: '#F28B82', info: '#7FB8E0' },
} as const;
export const dark = { bg: '#0A1928', paper: '#10263D', raised: '#153351', text: '#E6ECF1', textMuted: '#9FB0BF' } as const;
export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const;
export const layout = { sidebarWidth: 248, sidebarRail: 72, headerHeight: 64, contentMaxWidth: 1440 } as const;
export const motion = { fast: 120, base: 200, slow: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' } as const;
```

### P1-T2 Theme with light and dark schemes
Replace `src/theme.ts` with `src/theme/index.ts` (update the import in `index.tsx`):
```ts
import { createTheme } from '@mui/material/styles';
import { brand, status, dark, radius } from './tokens';
import { components } from './components';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: {
      primary:   { main: brand.navy, dark: brand.navyDeep, light: brand.blue, contrastText: brand.white },
      secondary: { main: brand.gold, dark: brand.goldDark, light: brand.goldLight, contrastText: brand.navyDeep },
      success: { main: status.light.success }, warning: { main: status.light.warning },
      error: { main: status.light.error }, info: { main: status.light.info },
      background: { default: brand.mist, paper: brand.white },
      text: { primary: brand.navy, secondary: brand.slate },
      divider: brand.line,
    } },
    dark: { palette: {
      primary:   { main: brand.gold, dark: brand.goldDark, light: brand.goldLight, contrastText: brand.navyDeep },
      secondary: { main: status.dark.info, contrastText: brand.navyDeep },
      success: { main: status.dark.success }, warning: { main: status.dark.warning },
      error: { main: status.dark.error }, info: { main: status.dark.info },
      background: { default: dark.bg, paper: dark.paper },
      text: { primary: dark.text, secondary: dark.textMuted },
      divider: 'rgba(255,255,255,0.12)',
    } },
  },
  shape: { borderRadius: radius.md },
  typography: {
    fontFamily: '"Plus Jakarta Sans Variable","Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components,
});
export default theme;
```
- In `index.tsx`: `import '@fontsource-variable/plus-jakarta-sans';` (after `npm install @fontsource-variable/plus-jakarta-sans`); render `<InitColorSchemeScript attribute="class" />` (from `@mui/material/InitColorSchemeScript`) before the app; `<ThemeProvider theme={theme} defaultMode="system">`.
- **Accept:** unit test `theme/theme.test.ts` asserts `theme.colorSchemes.light.palette.primary.main === '#153351'`, dark `primary.main === '#C4A46F'`, dark `background.default === '#0A1928'`, and that `fontFamily` starts with `"Plus Jakarta Sans`.

### P1-T3 Component defaults
Create `src/theme/components.ts` exporting a `Components<Theme>` object. Required overrides (use `theme.vars.palette.*` so both schemes work):

| Component | Override |
|---|---|
| `MuiCssBaseline` | `body` uses `font-feature-settings: "tnum"` off by default; add `.tabular-nums { font-variant-numeric: tabular-nums }`; `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`; styled thin scrollbars |
| `MuiButton` | `defaultProps: { disableElevation: true }`; radius 8; min-height 40; `containedSecondary` hover uses `goldDark` |
| `MuiPaper` | `defaultProps: { elevation: 0 }`; `backgroundImage: 'none'`; 1px `divider` border for `elevation0` |
| `MuiCard` | `defaultProps: { variant: 'outlined' }`; radius 12 |
| `MuiAppBar` | `defaultProps: { elevation: 0, color: 'inherit' }`; background `background.paper`; bottom border `divider` |
| `MuiTextField` / `MuiSelect` / `MuiFormControl` | `defaultProps: { size: 'small' }` |
| `MuiOutlinedInput` | radius 8; focused outline `primary.main` 2px |
| `MuiChip` | radius 999; `fontWeight: 600` |
| `MuiTableCell` | `head`: `fontWeight: 600`, `color: text.secondary`, uppercase 0.75rem, letter-spacing 0.04em; body border `divider` |
| `MuiTooltip` | `defaultProps: { arrow: true }`; background `navyDeep` |
| `MuiDialog` | paper radius 12 |
| `MuiTab` | `textTransform: none`, `fontWeight: 600`, min-height 44 |
| `MuiLink` | `defaultProps: { underline: 'hover' }` |
| `MuiListItemButton` | radius 8 |

- **Accept:** `tsc` clean; no component in `src/` passes `elevation={…}` greater than 0 except menus, dialogs and popovers.

### P1-T4 Colour-mode toggle
`components/layout/ColorModeToggle.tsx`: an `IconButton` using `useColorScheme()` from `@mui/material/styles`; cycles light → dark → system; `aria-label="Switch colour mode"`; tooltip shows the current mode. (It is mounted in the header in P2-T3.)
- **Accept:** unit test: clicking twice from `light` results in `mode === 'system'`.

### P1-T5 Brand mark
`components/brand/BrandMark.tsx`, props `{ variant: 'light' | 'dark'; collapsed?: boolean }`.
- `variant` names the **surface**: `dark` = on a navy surface (use the `-white` files), `light` = on a light surface (use the blue files). In dark colour mode callers always pass `dark`.
- Expanded: the mark (`/brand/adalex-mark-white.png` or `/brand/adalex-mark.png`) at 32px, then "ICEPac" (700 weight, 1.125rem) with "by Adalex Consulting" beneath (overline style; gold on dark, `goldText` on light).
- `collapsed`: the 32px mark only, with `alt="ICEPac by Adalex Consulting"`.
- Also export `AdalexLogo` (`variant: 'light' | 'dark'`, `height` default 28) which renders the full logo file. Use it in the sidebar footer above the collapse toggle (hidden in rail mode) and on the login page.
- If an image fails to load (`onError`), render the text only; never show a broken image.
- **Accept:** unit tests: `variant="dark"` requests a `-white` file; `collapsed` renders one image and no text; the text fallback renders when the image errors.

### P1-T6 Formatters
`src/utils/format.ts`:
```ts
const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'AUD';
const LOCALE = import.meta.env.VITE_LOCALE ?? 'en-AU';
export const formatCurrency = (v: number | null | undefined, opts: { compact?: boolean } = {}) =>
  v == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY,
    notation: opts.compact ? 'compact' : 'standard', maximumFractionDigits: opts.compact ? 1 : 2 }).format(v);
export const formatNumber = (v: number | null | undefined) => v == null ? '—' : new Intl.NumberFormat(LOCALE).format(v);
export const formatPercent = (v: number | null | undefined, digits = 0) => v == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: digits }).format(v);
export const formatDate = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';
export const formatDateTime = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';
```
- Delete the five local `formatCurrency` definitions (`ProjectRiskRegister`, `EstimationSummary`, `WBSDetailPanel`, `AssignmentList`, `RiskList`) and import this one. Add `VITE_CURRENCY` and `VITE_LOCALE` to `.env.example`.
- **Accept:** `grep -rn "'USD'" src` returns nothing; unit tests cover null, a normal value (`A$1,234.50` or `$1,234.50` depending on the Node ICU build — assert with a regex `/\$1,234\.50/`), and compact.

### P1-T7 Chart palette
`src/theme/charts.ts` exports `chartColors.light` and `chartColors.dark` arrays as listed in section 3.3.

**Phase 1 gate:** `npm run verify`; the smoke screenshots show Plus Jakarta Sans, navy headings and the mist background; style budget not increased.

---

## 7. Phase 2 — Application shell

**Outcome:** one coherent, responsive shell with a branded sidebar, a useful header, guarded routes and a command palette.

### P2-T1 Sidebar
- `components/layout/navConfig.tsx` exports the navigation model:
  - **Workspace:** Dashboard `/`, Projects `/projects`, Reports `/reports`
  - **Administration** (visible only when the JWT `role` is `admin`): Overview `/admin`, Users `/admin/users`, Resources `/admin/resources`, Suppliers `/admin/suppliers`, Config Tables `/admin/config`, Audit Logs `/admin/audit-logs`
  - **Support:** Help `/help`
- `Sidebar.tsx`: `variant="permanent"` at `md` and up, `variant="temporary"` below `md`. Width 248px, or 72px rail when collapsed (state persisted in `localStorage` key `icepac.sidebarCollapsed`). Background `navyDeep` in both colour modes; `BrandMark variant="dark"` at the top; section labels as overlines at 50% white; items at 70% white, hover 8% white overlay, active item white with a 3px gold left bar and 10% white background. In rail mode show icons only with tooltips.
- Active matching: an item is active when `pathname === path` or `pathname.startsWith(path + '/')`; `/` and `/admin` match exactly only.
- Selecting an item **must not** collapse the desktop sidebar; on mobile it closes the temporary drawer.
- `AppLayout.tsx`: CSS grid/flex with the main area `minWidth: 0`, padding `{ xs: 2, md: 3 }`, content `maxWidth: 1440`, no hardcoded `ml: '240px'`.
- **Accept (e2e `shell.spec.ts`):** on `/projects/1`, the "Projects" item has `aria-current="page"`; at 390px width the sidebar is hidden until the menu button is pressed and closes after navigating; collapse toggle persists across reload; a `user`-role login shows no "Administration" section.

### P2-T2 Remove the nested admin layout
- Delete `pages/admin/AdminLayout.tsx`. In the router, admin pages become direct children of `AppLayout` (`/admin`, `/admin/users`, …).
- **Accept:** on `/admin/users` exactly one `nav` landmark exists in the DOM.

### P2-T3 Header
`Header.tsx`: 64px, `background.paper`, bottom border. Left: menu button (mobile) or collapse toggle (desktop), then `Breadcrumbs`. Right: search trigger button showing "Search… Ctrl K" (opens the command palette), `ColorModeToggle`, `UserMenu`.

### P2-T4 Breadcrumbs
`Breadcrumbs.tsx` built from the route: static labels from `navConfig`; for `/projects/:id` show the project name (from the query cache when available, otherwise "Project {id}"); for `/help/:id` the topic title. Last crumb is plain text with `aria-current="page"`.
- **Accept:** unit test for `/admin/users` → "Administration / Users"; for `/projects/7` with a cached project named "Alpha" → "Projects / Alpha".

### P2-T5 Authentication context, guard and user menu
- **Backend:** add `GET /auth/me` to `app/routes/auth.py` returning the current user through the existing user response schema (`Depends(get_current_user)`). Add pytest cases in `tests/`: 200 with a valid token, 401 without. Keep flake8/black/isort clean.
- `auth/token.ts`: `getToken()`, `setTokens()`, `clearTokens()`, `decodeJwt(token)` (base64url-decode the payload; return `null` on any error), `isExpired(payload)`.
- `auth/AuthContext.tsx`: provides `{ user, role, isAuthenticated, login(username, password), logout() }`. `role` comes from the JWT claim; `user` from `GET /auth/me`. `logout()` clears tokens and the query cache, then navigates to `/login`.
- `auth/RequireAuth.tsx`: redirects to `/login?next=<path>` when there is no unexpired token. `RequireRole role="admin"` renders a "Not authorised" `ErrorState` for other roles. Wrap `AppLayout` in `RequireAuth`, and the admin routes in `RequireRole`.
- `UserMenu.tsx`: avatar with initials; menu shows full name, email, role chip, "Help", "Sign out".
- **Accept:** e2e: visiting `/projects` with no token lands on `/login?next=%2Fprojects`; after login the user returns to `/projects`; "Sign out" returns to `/login` and `localStorage` has no `access_token`; a `user`-role visit to `/admin/users` shows "Not authorised". Backend `pytest` passes.

### P2-T6 Command palette
`CommandPalette.tsx`: MUI `Dialog` + `Autocomplete` (no new dependency). Opens on Ctrl+K / ⌘K and from the header button; closes on Escape. Sources: all nav destinations the user may see, the first 50 projects (`getProjects`), and actions "New project", "Toggle colour mode", "Sign out". Enter navigates or runs the action.
- **Accept:** e2e: Ctrl+K, type a fixture project name, Enter → URL is `/projects/<id>`.

### P2-T7 Error and not-found states
- `components/common/ErrorState.tsx` (`title`, `description`, optional `action`). Rebuild the `ErrorBoundary` fallback in `App.tsx` and `NotFound.tsx` on it (removes the inline styles in `App.tsx`).
- Move routing into `app/routes.tsx` and lazy-load each page with `React.lazy` + a `Suspense` fallback of `LinearProgress` pinned under the header.
- **Accept:** `/does-not-exist` shows "Page not found" with a "Back to dashboard" button that works.

**Phase 2 gate:** `npm run verify`; `pytest` green; axe scan (`e2e/a11y.spec.ts`, added here) reports **no `serious` or `critical` violations** on `/login`, `/`, `/projects` in both colour modes; style budget lower than after Phase 1.

---

## 8. Phase 3 — Data layer and shared building blocks

**Outcome:** the reusable pieces every screen conversion in Phase 4 depends on. Each ships with a unit test.

### P3-T1 TanStack Query
- `npm install @tanstack/react-query`. `app/queryClient.ts`: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`; a global `QueryCache`/`MutationCache` `onError` that raises an error toast unless `meta.silent` is set.
- `app/providers.tsx` composes: `ThemeProvider` → `QueryClientProvider` → `ToastProvider` → `BrowserRouter` → `AuthProvider`.
- Query key convention: `['projects', 'list', { page, pageSize, search }]`, `['projects', id]`, `['projects', id, 'wbs-tree']`, `['projects', id, 'estimation']`, `['admin', 'users', params]`, `['dashboard', 'stats']`, etc. Mutations invalidate the matching list key.

### P3-T2 Toasts
`components/feedback/ToastProvider.tsx`: context exposing `useToast()` → `{ success(msg), error(msg), info(msg) }`; renders one MUI `Snackbar` + `Alert` (`variant="filled"`), bottom-right, 4s auto-hide (errors 8s), queued one at a time.
- **Accept:** unit test: calling `success('Saved')` shows an element with `role="alert"` containing "Saved".

### P3-T3 Page scaffolding
- `PageHeader.tsx`: `title`, optional `subtitle`, optional `actions` slot (right-aligned, wraps under the title on mobile).
- `EmptyState.tsx`: `icon`, `title`, `description`, optional `action` button; centred, dashed `divider` border, 48px icon in `text.secondary`.
- `CardSkeleton.tsx`, `TableSkeleton.tsx` (`rows`, `columns` props) built on MUI `Skeleton` with `animation="wave"`.
- `StatCard.tsx`: `label`, `value` (ReactNode), optional `icon`, `hint`, `trend`, `onClick`, `loading`. Label as overline; value as `h4` with tabular numerals; clickable cards lift 2px on hover and show a focus ring.

### P3-T4 Status chips
`StatusChip.tsx` — one component, one mapping, used everywhere:

| Kind | Value → colour |
|---|---|
| `approval` | draft → default, submitted → warning, approved → success, rejected → error |
| `active` | true → success "Active", false → default "Inactive" |
| `role` | admin → primary, manager → info, user → default, viewer → default (outlined) |
| `job` | pending → default, processing → info, completed → success, failed → error |
| `risk` | open → warning, mitigated → info, closed → success |

Soft style: 12% tint background of the palette colour with the palette colour as text. Confirm the actual enum values in the backend models before finalising, and add any that are missing.

### P3-T5 DataTable
- `npm install @mui/x-data-grid`. `components/common/DataTable.tsx` wraps `DataGrid` with project defaults: `disableRowSelectionOnClick`, `disableColumnMenu` off, `density="comfortable"`, `pageSizeOptions={[10, 25, 50]}`, `autoHeight` off with a flex container, column header style matching `MuiTableCell` head, no outer border radius clash, `slots.noRowsOverlay` = `EmptyState`, `slots.loadingOverlay` = linear progress with `TableSkeleton` on first load.
- Props: `rows`, `columns`, `loading`, `rowCount?`, `paginationModel?`, `onPaginationModelChange?`, `sortModel?`, `onSortModelChange?`, `onRowClick?`, `emptyTitle`, `emptyDescription`, `emptyAction?`, `toolbar?`. When `rowCount` is provided it runs in server pagination and sorting mode.
- **Accept:** unit tests: renders rows; shows the empty state with zero rows; fires `onPaginationModelChange`.

### P3-T6 Dialogs and search
- `components/common/ConfirmDialog.tsx` (`open`, `title`, `message`, `confirmLabel`, `destructive?`, `loading?`, `onConfirm`, `onClose`) and `FormDialog.tsx` (`open`, `title`, `onClose`, `onSubmit`, `submitLabel`, `loading`, `maxWidth`, children) on MUI `Dialog`; `fullScreen` below `sm`; submit on Enter; the confirm button is `color="error"` when `destructive`.
- `SearchField.tsx`: MUI `TextField` with search icon, clear button and 300ms debounce (`onChange` receives the debounced value).
- **Accept:** unit tests for confirm/cancel callbacks and for the debounce (use fake timers).

### P3-T7 PERT range bar
`components/common/PertRangeBar.tsx`, props `{ best: number; likely: number; worst: number; pert: number; low80?: number; high80?: number }`. A 10px track from `best` to `worst`; a darker band for `low80`–`high80`; a tick for `likely`; a gold marker for `pert`; `Tooltip` with all values via `formatCurrency`; `role="img"` with an `aria-label` that reads the numbers. Positions are percentages of `(value − best) / (worst − best)`, clamped 0–100; if `worst === best` render a single marker.
- **Accept:** unit test: with best 10, likely 15, worst 25, pert 15.83 the marker's `left` style is `38.9%` ±0.2.

**Phase 3 gate:** `npm run verify`; every component in `components/common/` and `components/feedback/` has a test file.

---

## 9. Phase 4 — Convert every screen

**Outcome:** all screens use the shared components and theme; admin and reports run on real API data; the style budget reaches zero.

### 9.1 Conversion recipe (apply to every screen)

1. Read the page and list its API calls. Check each against `app/routes/*.py`.
2. Replace `useEffect` fetching with `useQuery`; replace writes with `useMutation` that invalidates the list key and raises a success toast.
3. Delete every `MOCK_*` constant and the local `toast` state.
4. Structure: `PageHeader` (title, subtitle, primary action in gold `color="secondary" variant="contained"`), then a toolbar row (`SearchField`, filters), then content in a `Card`.
5. Tables → `DataTable` with server pagination where the endpoint supports `skip`/`limit`. Money columns right-aligned with `formatCurrency` and class `tabular-nums`. Dates via `formatDate`. Row actions as icon buttons with tooltips and `aria-label`s.
6. Three states, always: loading (`TableSkeleton` / `CardSkeleton`), empty (`EmptyState` with a call to action), error (`ErrorState` with "Retry" calling `refetch`).
7. Dialogs → `FormDialog` / `ConfirmDialog`. Forms validate required fields and show helper text; the submit button shows a spinner while saving.
8. Remove every inline `style`, hex colour and emoji from the file.
9. Add or extend an e2e spec for the screen: list renders from fixtures; create/edit/delete each issue the expected request (assert method, URL and body via `page.waitForRequest`) and show a toast; empty and error states render (mock an empty list and a 500).
10. Run `npm run style-budget` and confirm the counts dropped.

### 9.2 Screen-by-screen tasks

| ID | Screen / file | Specific notes |
|---|---|---|
| P4-T1 | `pages/Login.tsx` | Split layout: left panel (hidden below `md`) on `navyDeep` with a subtle radial blue glow, `BrandMark variant="dark"`, headline "Estimate with confidence." and three short product points; right panel with the form. Username and password fields with `autoComplete`, password show/hide toggle, gold "Sign in" button with loading state, inline `Alert` for errors, honours `?next=`. No backend change. |
| P4-T2 | `pages/admin/UserManagement.tsx` | `usersApi`. Columns: name, username, email, role (`StatusChip role`), status (`StatusChip active`), last login, actions (edit, reset password, delete). Filters: role, status. |
| P4-T3 | `pages/admin/ResourceLibrary.tsx` | `resourcesApi`. Columns: code, description, EOC, cost (currency), units, supplier, status. Filter by EOC from loaded data. |
| P4-T4 | `pages/admin/SupplierManagement.tsx` | `suppliersApi`. Columns: name, contact, email, phone, status. |
| P4-T5 | `pages/admin/ConfigTables.tsx` | Left: list of tables from `configApi.listTables()` (vertical `Tabs` on desktop, `Select` on mobile). Right: `DataTable` of items; show the "Weight" column only when `weighted` is true. |
| P4-T6 | `pages/admin/AuditLogs.tsx` | `auditApi.list` read-only. Filters: action, entity type. Row click opens a `Drawer` with old/new values pretty-printed in a monospace block. |
| P4-T7 | `pages/admin/AdminDashboard.tsx` | `getDashboardStats()`: `StatCard`s for users, active users, resources, suppliers; "Recent activity" list from `recent_activity`; quick links to each admin page. |
| P4-T8 | `pages/Reports.tsx`, `components/reports/*` | `reportsApi.catalog()` drives `ReportSelector` (cards grouped by category, selected card outlined in gold). `FilterPanel` uses MUI inputs with project options from `getProjects`. `ReportPreview` uses `DataTable` (client-side) with a totals footer row. `ExportOptions` is a split button (PDF, XLSX, DOCX, CSV) with a progress state and a success toast. |
| P4-T9 | `pages/Projects.tsx` | Card grid / table toggle (persist choice in `localStorage`). Card: name, code, status chip, last updated, WBS count if present in the response. Gold "New project" action. Search via `SearchField`. |
| P4-T10 | `pages/ProjectDetail.tsx` | Header band with project name, status, key totals (`StatCard`s from `getProjectEstimation`). Tabs synced to the URL (`?tab=wbs|summary|risks|imports`). WBS tab: `react-resizable-panels` split — tree left (min 280px), `WBSDetailPanel` right; below `md` the detail opens in a full-height `Drawer`. Reference data loads via `useQuery` with `staleTime: 5 min`. |
| P4-T11 | `components/project/WBSTree.tsx` | Rebuild on MUI `List` with indentation, expand/collapse chevrons, per-row `StatusChip approval` and PERT total. Keyboard: Up/Down move, Left/Right collapse/expand, Enter selects (`role="tree"`, `treeitem`, `aria-expanded`, `aria-selected`). "Expand all / Collapse all" and a filter box. |
| P4-T12 | `components/project/ProjectUpload.tsx` | Drag-and-drop zone (dashed border, highlights in gold on drag-over), accepted types listed, `LinearProgress` during upload, import-job status polled with `useQuery` `refetchInterval` until completed/failed, result summary and import history table. |
| P4-T13 | `components/estimation/*`, `components/project/ProjectRiskRegister.tsx` | Already MUI: align to shared components (`DataTable` where they are tables, `StatusChip`, `formatCurrency`, `ConfirmDialog`, toasts). In `AssignmentList` add a `PertRangeBar` column. In `EstimationSummary` show the 80% interval with `PertRangeBar`. `ApprovalWorkflow`: MUI `Stepper` showing draft → submitted → approved, or rejected. |
| P4-T14 | `pages/Help.tsx`, `pages/HelpTopic.tsx`, `pages/Dashboard.tsx` | Apply `PageHeader`, skeletons, empty states. Help: category chips + search. (Dashboard content is rebuilt in Phase 5; here only remove hardcoded colours.) |
| P4-T15 | Clean-up | Delete `components/admin/` and any unused files. Set `style-budget.json` to `{ "inlineStyle": 0, "hex": 0, "emoji": 0 }`. Re-enable `@typescript-eslint/no-explicit-any` as `error` and fix what it reports. |

**Phase 4 gate:**
- `npm run verify` green with the style budget at 0 / 0 / 0.
- `grep -rn "MOCK_" src` returns nothing; `components/admin/` does not exist.
- Every route in section 9.2 has an e2e spec with list, empty and error cases; CRUD screens also cover create, edit and delete.
- Axe: no serious or critical violations on every route, light and dark.
- At 390px width no page scrolls horizontally: e2e asserts `document.documentElement.scrollWidth <= window.innerWidth` on each route.

---

## 10. Phase 5 — Dashboard and charts

**Outcome:** the home page shows the portfolio at a glance, and project pages visualise cost.

### P5-T1 Backend: portfolio endpoint
Add `GET /dashboard/portfolio` in `app/routes/dashboard.py` (authenticated). Response:
```json
{ "projects": [ { "project_id": 1, "name": "…", "status": "active",
                  "wbs_total": 42, "wbs_approved": 30, "wbs_submitted": 5,
                  "total_pert": 1234567.89, "risk_count": 7 } ],
  "approval_totals": { "draft": 0, "submitted": 0, "approved": 0, "rejected": 0 } }
```
`total_pert` is `SUM((best + 4·likely + worst) / 6)` over the project's assignments (same expression as `dashboard_stats`), joined through WBS. Order by `total_pert` descending, limit 20 (query parameter `limit`, max 100). Add a Pydantic response model and pytest cases using the SQLite `db` fixture in `tests/conftest.py`: empty database; two projects with known assignments (assert exact totals); unauthenticated → 401.

### P5-T2 Dashboard page
- `npm install @mui/x-charts`. `api/dashboard.ts` gains `getPortfolio()`.
- Layout (12-column grid, stacks on mobile):
  1. Greeting line "Good morning, {first name}" with today's date, and a gold "New project" button.
  2. Four `StatCard`s: Active projects, Total estimate (compact currency, with `AnimatedNumber`), WBS awaiting approval, Open risks. All from `/dashboard/stats`.
  3. "Estimate by project" — horizontal `BarChart` of the top 10 projects (8 columns wide); clicking a bar opens the project.
  4. "Approval status" — donut `PieChart` of `approval_totals` with the centre showing percent approved (4 columns).
  5. "Recent activity" — list from `recent_activity` with icon per action, relative time and absolute time in a tooltip.
  6. "System health" — from `/dashboard/health-detailed`: one row each for app, database, cache, storage, Java, with a real status dot; overall badge. **Delete the hardcoded `systemStatus` array.** If the endpoint fails, show "Health unavailable" instead of green ticks.
- Charts take colours from `theme/charts.ts` for the current mode, have axis labels formatted with `formatCurrency({ compact: true })`, and a visually hidden data table (`<table>` with `sx` clip) as the accessible alternative.
- **Accept:** e2e with fixtures: the four figures match the fixture values; the bar chart has 10 bars (count `rect` elements within the chart container or use the hidden table rows); with an empty portfolio the charts are replaced by an `EmptyState` linking to "New project"; with `/dashboard/health-detailed` returning 500 the page still renders.

### P5-T3 Project cost visualisation
In `EstimationSummary`: above the tabs add a "Cost breakdown" card with a segmented control (Cost type / Region / Resource / Supplier) driving a donut plus a ranked list with share percentages; and a "Top WBS items by estimate" bar chart (top 10 from `wbs_summaries`), each with a `PertRangeBar` showing `confidence_80_low`–`confidence_80_high`.
- **Accept:** unit test: given a summary fixture, the breakdown list is sorted descending and percentages sum to 100 ±1.

**Phase 5 gate:** `npm run verify`; backend `pytest`, flake8, black, isort green; dashboard screenshots attached to the PR for desktop and mobile in both colour modes.

---

## 11. Phase 6 — Motion, polish and sign-off

**Outcome:** the interface feels responsive and finished, and the result is documented.

| ID | Task | Accept |
|---|---|---|
| P6-T1 | `AnimatedNumber.tsx`: counts from the previous value to the new one over 600ms with `requestAnimationFrame` and ease-out; renders the final value immediately when `prefers-reduced-motion: reduce` matches. | Unit test with reduced motion mocked: final value rendered synchronously. |
| P6-T2 | Route transition: wrap the `Outlet` in an MUI `Fade` keyed on `location.pathname` (200ms). Cards and list rows: 120ms hover transitions on `background-color`, `border-color`, `transform` only. | No layout shift: e2e asserts the page heading's bounding box is unchanged 400ms after navigation. |
| P6-T3 | Optimistic updates for: active/inactive toggles on admin tables, approval actions, risk status. Use `onMutate` / `onError` rollback / `onSettled` invalidate. | Unit test: a failing mutation restores the previous cache value and raises an error toast. |
| P6-T4 | Loading polish: `placeholderData: keepPreviousData` on paginated lists so tables do not blank between pages; a 2px `LinearProgress` under the header whenever `useIsFetching() > 0`. | e2e: paging a table never shows the skeleton after first load. |
| P6-T5 | Focus and keyboard pass: visible `:focus-visible` ring (2px, gold on dark surfaces, navy on light) on every interactive element; dialogs return focus to their trigger; a "Skip to content" link as the first tab stop. | e2e: first Tab on `/` focuses "Skip to content"; axe clean on all routes in both modes. |
| P6-T6 | Performance budget: keep the entry chunk small via the lazy routes from P2-T7; charts and the data grid must not be in the entry chunk. | After `npm run build`, the largest entry `*.js` in `build/assets` is under 350 kB gzipped (script `scripts/bundle-budget.mjs`, added to `verify`). |
| P6-T7 | Favicon and metadata: replace `public/favicon.ico` with icons generated from `public/brand/adalex-mark.png` (the blue diamond on a transparent background: `favicon.ico` at 16/32/48px, `icon-192.png`, `icon-512.png`, referenced from `index.html` and `manifest.json`); `manifest.json` `theme_color: #153351`, `background_color: #F5F7F9`. | `build/index.html` references the new icon. |
| P6-T8 | Documentation: rewrite `frontend/README.md` (run, test, env vars, theme tokens, how to add a screen using the recipe in 9.1). Add a "UI" section to the root `README.md`. Tick the branding items in `IMPLEMENTATION_CHECKLIST.md` and `MODERNIZATION_PLAN.md`. | Files updated; commands in the README were run and work. |
| P6-T9 | Final review pack: run the full e2e suite and attach the `__screenshots__` artefact (every route × desktop/mobile × light/dark) to the PR for Adam's sign-off. | Artefact present on the PR. |

**Phase 6 gate / definition of done for the whole programme:**
1. `npm run verify` green locally and in CI; backend CI jobs green.
2. Style budget 0 / 0 / 0; no `MOCK_` data; no `any` lint suppressions.
3. Axe: zero serious or critical violations on all routes, both modes.
4. No horizontal scroll at 390px on any route.
5. `docker compose up` serves a working, branded app end to end against the real API (manual check by Adam: sign in, open a project, edit an estimate, run a report, switch to dark mode).

---

## 12. Decisions made on Adam's behalf (change before Phase 1 if wrong)

| Decision | Chosen | Alternative |
|---|---|---|
| Default currency and locale | AUD, `en-AU`, configurable by env var | Per-project currency (needs a schema change; out of scope) |
| Primary button colour in light mode | Navy, with gold reserved for the one key action per screen | Gold for all primary buttons (closer to the Adalex hero, but tiring across a data-heavy app) |
| Sidebar | Always dark navy | Light sidebar in light mode |
| Admin navigation | A section in the main sidebar, visible to admins only | Separate admin area |
| Table library | MUI X Data Grid community edition (free). Column pinning, row grouping and Excel export are paid features and are not used. | TanStack Table (more work, fully free) |
| Admin and report screens | Wired to the real API as part of conversion (they show mock data today) | Keep mocks and restyle only |

## 13. Inputs needed from Adam

1. ~~Logo files~~ — received and committed (section 3.4).
2. Confirmation of the decisions in section 12.
3. A seeded admin login for the manual check at the end of each phase.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Vite migration surfaces further build issues | Isolated in Phase 0 with its own gate before any visual work |
| Wiring admin screens to the real API exposes backend gaps | Rule 5 in section 1: remove calls with no route and report them; do not invent endpoints |
| Mocked e2e tests drift from the real API | Fixtures copied from Pydantic schemas; manual check against the real backend at each phase gate |
| MUI X or MUI 7 API differs from snippets here | Installed types win; note differences in the PR |
| Scope creep during screen conversion | The recipe in 9.1 is the whole job for a screen; anything else goes to a follow-up list in the PR |

## 15. Effort guide

| Phase | Tasks | Relative size |
|---|---|---|
| 0 Stabilise | 9 | Medium |
| 1 Design system | 7 | Small |
| 2 Shell | 7 | Medium |
| 3 Building blocks | 7 | Medium |
| 4 Screens | 15 | Large (roughly half the total) |
| 5 Dashboard | 3 | Medium |
| 6 Polish | 9 | Small–medium |
