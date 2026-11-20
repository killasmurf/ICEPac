# Real-API smoke suite

End-to-end smoke test of the built React UI against a **real** FastAPI server on SQLite. The mocked suite
(`frontend/e2e`) cannot catch contract mismatches; this one can. It is **not part of CI**.

**Status (2026-11-18, after #29 and #30): 31 of 31 tests pass as plain assertions**, with no `knownBug()` markers
and no workaround for the approval endpoint. The first run (`main` at da9b36e) had 20 passing and 11 failing on
findings F-01 to F-11 and F-14; those are fixed (see the Status column below). The re-run also found F-17
(timestamps shown 11 hours early in Melbourne), fixed in the same change as this update.

## Run it from scratch

Ports: API 8010, web 3240. Paths are relative to the repo root.

```bash
# 1. Backend env (SQLite; Redis is not needed; make S3 fail fast, see F-12)
export DATABASE_URL=sqlite:////tmp/icepac-smoke.db
export SECRET_KEY=smoke-secret-key-for-local-only
export ALLOWED_ORIGINS=http://localhost:3240
export S3_ENDPOINT_URL=http://127.0.0.1:1 AWS_ACCESS_KEY_ID=smoke AWS_SECRET_ACCESS_KEY=smoke AWS_MAX_ATTEMPTS=1

# 2. Seed (creates tables; --reset drops them first. REQUIRED before every run: the suite mutates data)
python scripts/seed_smoke.py --reset

# 3. Start the API
nohup python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 > /tmp/icepac-api.log 2>&1 & echo $! > /tmp/icepac-api.pid

# 4. Build and serve the frontend (env var is VITE_API_URL, prefix /api/v1)
cd frontend && npm ci
VITE_API_URL=http://localhost:8010/api/v1 npm run build
nohup npx vite preview --port 3240 --strictPort > /tmp/icepac-web.log 2>&1 & echo $! > /tmp/icepac-web.pid

# 5. Run (Chromium + Playwright are pre-installed; never `playwright install`)
npx playwright test -c playwright.real.config.ts        # about 3.5 minutes
```

Stop both servers afterwards by PID: `kill $(cat /tmp/icepac-api.pid) $(cat /tmp/icepac-web.pid)`. Do not use
`pkill -f "vite preview"`: on a shared machine it also kills other people's preview servers (it once killed a
parallel `npm run verify`).
Re-seeding while the API is running leaves it with stale connections: restart the API after `--reset`.

Overrides: `SMOKE_API_URL` (default `http://localhost:8010/api/v1`), `SMOKE_WEB_URL`.

Outputs (git-ignored, `frontend/e2e-real/__screenshots__/`): one PNG per main screen, `diagnostics.jsonl` and
`diagnostics-summary.json` (every browser console error and HTTP status >= 400, per test), `findings-data.json`
(raw API evidence, export filenames, manager-permission result). Downloads land in `__downloads__/`.

### Seed users (`scripts/seed_smoke_data.json`, printed by the seed script)

| role | username | password |
|---|---|---|
| admin | `smoke_admin` | `SmokeAdmin#2026` |
| manager | `smoke_manager` | `SmokeManager#2026` |
| user | `smoke_user` | `SmokeUser#2026` (the suite resets it to `SmokeUser#2027-reset`) |

Seed: 3 projects (Harbour Crossing Upgrade, Regional Depot Fit-out, and a long-named project with null manager,
null description and zero-value assignments), 20 WBS items over 3 levels with draft/submitted/approved/rejected
mixed, 13 assignments (total PERT 530,166.67), 2 WBS-level and 3 project-level risks, 6 resources, 3 suppliers,
all 10 config tables, 8 audit rows. Idempotent (get-or-create by natural key). The Alembic migrations contain
**no** seed data, so `create_all` leaves every config table, resource and supplier empty: the script seeds them.

## What it covers

Login (good and bad); admin dashboard figures vs seed constants, charts, health panel; projects list; project
WBS tree (3 levels) and detail panel PERT values; Summary tab; edge-case project; reports (Cost by WBS; Cost by
Resource preview, CSV and XLSX downloads, filename from `Content-Disposition`; all 16 catalog types via API);
create assignment and header totals; submit then approve; project risks tab; admin users, password reset without
current password then sign-in as that user, config tables, audit logs; manager permissions; plain-user
restrictions. Not covered: PDF/DOCX export, MPP import (needs Java/MPXJ), async report jobs (Celery), help pages,
project create/edit/archive, mobile layout.

## Environment notes

* Needed but not in `.env.example`/`SETUP.md`: nothing beyond `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`
  including the web origin. `init_db()` is **not** called by the app at startup; tables only exist if something
  calls `create_all` or Alembic runs (the seed script does).
* Redis absent: harmless. Rate limiter and cache fail open (`/health` reports cache "unavailable"). With Redis,
  `/auth/login` is limited to 5 per minute, which this suite would exceed.
* S3 absent: harmless except F-12. Java present here, MPP import not exercised. Celery absent:
  `POST /reports/jobs` marks the job failed ("Failed to queue task") instead of erroring; not exercised in the UI.
  Report preview and export are synchronous and need no broker.
* The manager/admin split is enforced in two different places (see F-13).

## Findings

Product bugs first. Severity: blocker = a core flow is unusable; major = wrong data or a security hole; minor =
degraded but usable; cosmetic.

| ID | Status | Sev | Area | What happens | Evidence | Suggested fix (files) |
|---|---|---|---|---|---|---|
| F-01 | Fixed #29 | blocker | Approval API / WBS detail panel | `GET` and `POST /projects/{id}/wbs/{id}/approval` always return 500. The WBS detail panel loads assignments, risks, approval and estimation in one `Promise.all`, so **every** WBS item shows "Could not load WBS details" and the panel (assignments, add assignment, approval buttons) is unusable. The `POST` commits the state change, then 500s. | Log: `1 validation error for WBSApprovalResponse / wbs_id / Field required [input_value=<WBS(id=3 ...)>]` at `app/routes/estimation.py:340` (`WBSApprovalResponse.model_validate(wbs)`; the ORM row has `id`, the schema wants `wbs_id`). Mock fixtures hid it. The suite works around it with a `page.route` shim (`shimApproval`) for the other flows. | Build the response explicitly (`wbs_id=wbs.id`) in both handlers, or add `validation_alias`/`@computed_field` in `app/models/schemas/estimation.py`. Files: `app/routes/estimation.py`, `app/models/schemas/estimation.py`. |
| F-02 | Fixed #29 | blocker | Risk create (both scopes) | `POST /projects/{id}/risks` and `POST /projects/{id}/wbs/{id}/risks` return 500 even with valid bodies, so no risk can be created from the UI. | Log: `'risk_exposure' is an invalid keyword argument for Risk` at `app/services/risk_service.py:128` (`create_for_project`). `RiskBase` declares `risk_exposure`, `model_dump()` passes it to the ORM. Probe: `POST /projects/1/risks {"title":"probe","risk_cost":10}` -> `500 {"detail":"Internal server error"}`. | `model_dump(exclude={"risk_exposure"})` in `RiskService.create` and `create_for_project`; better, move `risk_exposure` out of `RiskBase` into the response schemas. Files: `app/services/risk_service.py`, `app/models/schemas/risk.py`. |
| F-03 | Fixed #29 (PR #11 port) | blocker | Reports | 7 of 16 report types 500: `cost_by_wbs`, `boe_summary`, `boe_detailed`, `boe_by_wbs`, `risk_assessment`, `risk_summary`, `project_summary`. "Cost by WBS" (the headline report) cannot be generated or exported. | Log: `AttributeError: type object 'WBS' has no attribute 'title'` at `app/repositories/report_repository.py` lines 107, 115, 168, 223 (`WBS.title`; the column is `wbs_title`). `findings-data.json: reportStatus`. | Replace `WBS.title` with `WBS.wbs_title` (4 places). File: `app/repositories/report_repository.py`. |
| F-04 | Fixed #29 | major | Estimation totals | Project estimation ignores WBS-level risks: Harbour has 4 risks (portfolio says 4) but the header card and `/estimation` say `total_risks: 2`, exposure $19.5K instead of $47.7K, and every WBS row in the Summary tab shows 0 risks and $0 exposure. Risk-adjusted estimate is understated. | `GET /projects/1/estimation` -> `total_risks 2, total_risk_exposure 19500`; `GET /dashboard/portfolio` -> `risk_count 4`. Cause: `EstimationService.get_project_estimation` uses `RiskRepository.get_by_project` (project-level only) and then filters it by `wbs_id`. | Use `get_all_wbs_scoped_by_project` plus `get_by_project`. File: `app/services/estimation_service.py`. |
| F-05 | Fixed #30 | major | WBS risk form | Frontend `RiskCreate` omits the required `title` (and `status`), so the WBS-level risk form gets 422. The `Risk` TS type is also missing `title`, `status`, `project_id`. (With a title it hits F-02.) | `POST /projects/1/wbs/5/risks {"risk_category_code":"TECH","risk_cost":10}` -> `422 body.title Field required`. | Add a Title field to `RiskForm`, send it; fix types. Files: `frontend/src/components/estimation/RiskForm.tsx`, `RiskList.tsx`, `frontend/src/api/estimation.ts`. |
| F-06 | Fixed #29 | major | Config tables | `GET /admin/config/{probability-levels,severity-levels,pmb-weights}` omit `weight` (the list `response_model` is the unweighted `ConfigItemResponse`). Weight column shows "—"; `loadReferenceData` turns every weight into 0. | `{"items":[{"code":"HIGH","description":"High","id":3,"is_active":true,...}]}` (no `weight`). Test: "probability levels show their weights". | Use a union or per-table response model. File: `app/routes/admin.py` (`list_config_items`), `app/models/schemas/config.py`. |
| F-07 | Fixed #29 (reads for all roles) and #30 | major | Permissions / estimation forms | The assignment and risk forms load their dropdowns from `/admin/resources`, `/admin/suppliers`, `/admin/config/*`, which require admin or manager. For role `user` all 9 calls return 403, the form's Resource select is empty and a plain user cannot create an assignment. | `diagnostics-summary.json`: `403 GET /api/v1/admin/resources?limit=1000&active_only=true` and 8 more. | Expose read-only lookup endpoints to any authenticated user (e.g. `/lookups/*`) or relax the router dependency for GETs. Files: `app/routes/admin.py`, `frontend/src/pages/projectDetail/useProjectData.ts`. |
| F-13 | Fixed #29 and #30 (owner rules) | major (security, owner decision) | Manager privileges | UI hides Administration from managers (`navConfig` roles `['admin']`, `RequireRole admin`), but the whole `/admin` API only requires admin **or manager**. **A manager can create an admin user and promote themselves to admin.** | See "Manager permission result" below. | Require admin for user create/update/delete (and role changes) in `app/routes/admin.py`; decide whether managers should have any admin access. |
| F-14 | Fixed #30 | major | Assignment totals | Totals strip shows `Best $NaN  Likely $NaN  Worst $NaN` (PERT is right). The API serialises `Decimal` as strings (`"12000.00"`); the frontend types them as `number` and adds them. Same string-vs-number issue for `risk_cost` (types say string in `project-risks.ts`, number in `estimation.ts`) and config `weight`. | Screenshot `04-wbs-detail-assignments.png`; response `best_estimate":"12000.00"`. Test: "assignment totals strip shows Best/Likely/Worst sums". | Coerce with `Number()` in `AssignmentList` (and the api layer), or serialise decimals as floats on the server. Files: `frontend/src/components/estimation/AssignmentList.tsx`, `frontend/src/api/estimation.ts`. |
| F-08 | Fixed #29 | minor | Health | `GET /health` and `/dashboard/health-detailed` run `db.execute("SELECT 1")`; SQLAlchemy 2 rejects raw strings, so the database is always "unhealthy" and overall "degraded". The dashboard shows a red Database row with the raw exception text. | `"database":{"status":"unhealthy","error":"Textual SQL expression 'SELECT 1' should be explicitly declared as text('SELECT 1')"}`. | `text("SELECT 1")`. Files: `app/main.py`, `app/routes/dashboard.py`. |
| F-09 | Fixed #29 | minor | Dashboard recent activity | `recent_activity[].username` is always `""` (`getattr(log, "username", "")`; `AuditLog` has no such attribute), so the panel names every actor "System". | `/dashboard/stats` -> `"username":""`; screenshot `01-dashboard-admin.png`. `/admin/audit-logs` does resolve usernames. | Use `log.user.username if log.user else None`. File: `app/routes/dashboard.py`. |
| F-10 | Fixed #29 | minor | Error handling | Unhandled-exception 500s have no CORS headers (`ErrorHandlerMiddleware` is outermost, outside `CORSMiddleware`), so the browser reports "blocked by CORS policy / ERR_FAILED" instead of a 500; the UI sees a network error and the real cause is hidden. | Console: `Access to XMLHttpRequest at '.../wbs/3/approval' ... blocked by CORS policy`; curl shows the 500 JSON. | Add `ErrorHandlerMiddleware` before `CORSMiddleware`, or add an `Exception` handler. File: `app/main.py`. |
| F-11 | Fixed #29 | minor | Audit log | Assignment create/update/delete, risk CRUD and logins write no audit rows (only admin CRUD, password change, and approval actions do). Approval rows have no IP/user agent. | `findings-data.json: auditActions` (`CREATE_ResourceAssignment: false`, `LOGIN: false`). Test: "audit log records assignment creation ...". | Call `AuditService` in the estimation/risk routes and login. Files: `app/routes/estimation.py`, `app/routes/risk.py`, `app/routes/auth.py`. |
| F-12 | Fixed #29 | major in some environments | Event loop | `GET /dashboard/health-detailed` is `async def` but calls blocking boto3 `head_bucket` (and Redis ping). With S3 unreachable it takes 9-13 s and **freezes every other request**: `/projects` took 8.5 s while it ran, 16 ms alone. The dashboard polls it every 60 s. Seen here because S3 is unreachable; the suite sets `AWS_MAX_ATTEMPTS=1` and a refused endpoint to avoid it. | `health-detailed 8.98s`, concurrent `projects 8.49s`, alone `0.017s`. | Make the handler `def` (threadpool) or use `run_in_threadpool`, add short boto timeouts. File: `app/routes/dashboard.py`. |
| F-15 | Fixed #29 | cosmetic | Reports | Report totals sum already-rounded rows (PERT 458,833.34 vs header 458,833.33). Column header "WBS Item" is used for resource/supplier/region rows. | Screenshot `07-reports-cost-by-resource.png`. | Sum unrounded values; per-report label for the first column. Files: `app/services/report_engine.py`. |
| F-16 | Fixed #30 | cosmetic | Layout | At 1440 px the inline detail panel is too narrow for the 9-column assignments grid (PERT/Range columns clipped, horizontal scroll). "1 assignments" lacks pluralisation. Estimate-by-project card is much taller than its chart (stretched to the donut card). The legacy-project screenshot shows the detail panel as a perpetual skeleton (F-01). One run saw the WBS tree fall back to first-level-only after a full-page screenshot (not reproduced in isolation). | Screenshots `04`, `06`, `01`. | Frontend only. |

### Manager permission result (first run, before the fix)

Run as `smoke_manager` (role manager), token from the real login, against the real API:

* UI: no "Administration" nav section; `/admin/users` shows "Not authorised".
* `GET /admin/users` -> **200**.
* `POST /admin/users` with `"role":"admin"` -> **201**, created role `admin`.
* `PUT /admin/users/{own id}` with `{"role":"admin"}` -> **200**, role now `admin`.
* Both changes were reverted by the test (created user deleted: 204; own role restored to `manager`: 200) and
  verified with an admin token (no leftover rows, manager is `manager` again).

So the UI/API disagree: managers have full admin API access including privilege escalation (F-13).

### F-17 (found on the re-run, fixed with this update)

| ID | Status | Sev | Area | What happens | Evidence | Fix |
|---|---|---|---|---|---|---|
| F-17 | Fixed (frontend) | major | Dates and times | The API serialises UTC timestamps without a zone (`"created_at": "2026-11-18T05:50:35.909975"`); browsers read them as local time, so in Melbourne every created/updated/last-login/audit time showed 11 hours early and recent activity said "11 hours ago" for actions taken a minute earlier. | Container clock 16:50 AEDT; `/dashboard/stats` `created_at` 05:50:35; dashboard showed "11 hours ago". | `parseApiDate()` in `frontend/src/utils/format.ts` reads zone-less timestamps as UTC and keeps calendar dates (`T00:00:00`, used for start/finish dates) on the same day; used by `formatDate`, `formatDateTime` and the dashboard's relative time. Unit tests pass in Los Angeles, UTC, Melbourne and UTC+14. A longer-term option is for the API to emit timezone-aware UTC timestamps. |

### Passing observations worth keeping

Dashboard figures match the seed exactly ($530.2K, 13 assignments, 2 of 3 projects). Project header total
($458,833), assignment create (header became $461,000), submit/approve (chips change in panel and tree; audit rows
written), CSV/XLSX export (names `cost_by_resource_YYYYMMDD_HHMMSS.csv|xlsx` come from the server's
`Content-Disposition`, which the CORS config exposes), admin password reset without current password (old
password then 401, new one signs in), config tables and audit log pages, role gating for a plain user.
