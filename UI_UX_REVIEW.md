# ICEPac Frontend — UI/UX Review

*Generated: 2026-09-28*

---

## 1. Current Design System

### Theme Configuration

`frontend/src/theme.ts` defines only five values: `primary.main` (#1976d2), `secondary.main` (#dc004e), `background.default` (#f5f5f5), and `typography.h4.fontWeight: 600`. There is no spacing scale, no border radius token, no shadow token, no typography scale for h1/h2/h3/h5/h6/body, no component overrides, and no dark-mode palette.

### Dual Design System — the Root Architectural Problem

The application contains two completely incompatible design systems running side by side:

**Main app** (`AppLayout`, all pages under `/`, `/projects`, `/help`): Uses MUI v5 throughout — `Box`, `Paper`, `Typography`, `Button`, `Dialog`, `Table`, `Chip`, `Drawer`, `Alert`, `CircularProgress`, etc.

**Admin area** (`AdminLayout`, all pages under `/admin`): Uses plain `<div>`, `<h1>`, `<button>`, `<select>`, `<input>`, `<table>` with inline `React.CSSProperties` style objects. Also used in `ProjectUpload` and `WBSTree` despite being embedded inside the main app.

The two systems have different color palettes that never reference each other. Admin uses `#0f172a` (dark), `#64748b` (gray), `#3b82f6` (blue), `#10b981` (green), `#8b5cf6` (purple), `#f59e0b` (amber). Main app uses MUI default theme tokens.

### Inline Style Duplication

All six admin pages plus `DataGrid`, `FormDialog`, `ConfirmDialog`, and `SearchBar` define their own `styles` object. The same style declarations appear 5+ times across files: `container`, `header`, `title`, `subtitle`, `primaryButton`, `toolbar`, `tableCard`, `formGrid`, `formGroup`, `label`, `input`, `select`, `error`, `toast`, `toastSuccess`, `toastError`. Conservatively ~200 lines of identical style declarations are copy-pasted across files.

### What Is Missing from the Theme

No defined: `fontFamily` (admin uses `'Inter', -apple-system, ...` via inline style; main app inherits browser default), `spacing`, `border-radius` tokens, `error`/`warning`/`info`/`success` semantic colors beyond MUI defaults, `zIndex` configuration, breakpoints, `h5`/`h6`/`subtitle1`/`body1` font weight overrides.

---

## 2. Navigation & Information Architecture

### Routes (from App.tsx)

```
/login                         → Login
/ (AppLayout)
  /                            → Dashboard
  /projects                    → Projects
  /projects/:id                → ProjectDetail
  /projects/:id/reports        → Reports (standalone page)
  /help                        → Help
  /help/:id                    → HelpTopic
/admin (AdminLayout)
  /admin                       → AdminDashboard
  /admin/users                 → UserManagement
  /admin/resources             → ResourceLibrary
  /admin/suppliers             → SupplierManagement
  /admin/config                → ConfigTables
  /admin/audit-logs            → AuditLogs
```

### Sidebar Items (from Sidebar.tsx)

Dashboard (`/`), Projects (`/projects`), Reports (`/reports`), Help (`/help`).

**Critical navigation bug**: The "Reports" sidebar item navigates to `/reports`, but this route does not exist in `App.tsx`. Reports live at `/projects/:id/reports`. Clicking "Reports" in the sidebar will show a blank page or 404.

**Active state bug**: `Sidebar.tsx` uses `location.pathname === item.path` for all items. When the user is at `/projects/42`, the "Projects" item is not highlighted because the exact path `/projects` does not match `/projects/42`.

**No navigation between admin and main app**: `AdminLayout` has no link back to the main application. The main app's `Sidebar` has no link to `/admin`.

**No breadcrumbs in the main app**: `AdminLayout` has a two-level breadcrumb. The main app has none.

**Tab state is not URL-encoded**: `ProjectDetail` manages its active tab with local state. Refreshing always resets to the Overview tab.

---

## 3. Page-by-Page Audit

### Login
- Submit button has no loading/disabled state — multiple clicks can fire multiple auth requests.
- No password visibility toggle.
- No application logo or branding.

### Dashboard
- Only two stat cards: "Active Projects" (counts all projects including archived) and "Help Topics".
- No PERT totals, no outstanding approvals, no recently modified projects, no risk exposure.
- `StatCard` is locally defined and not shared.

### Projects
- **No debounce on search**: every keystroke fires an API request.
- `window.confirm()` for delete — inconsistent with admin's `ConfirmDialog`.
- Confirm message says "Archive this project?" but `deleteProject` is called — wording mismatch.
- No pagination; API called with `limit: 100`.
- `STATUS_COLORS` duplicated from `ProjectDetail.tsx`.

### ProjectDetail
- `useEffect` for lookup data triggers on WBS tab (tab 1) unnecessarily — the WBS tree doesn't use any lookup data, causing 9 wasted API requests.
- Edit form has no validation; empty `project_name` allowed.
- No success feedback after saving project edits.
- `STATUS_COLORS` duplicated from `Projects.tsx`.
- `Drawer` is imported but never used directly — it's the `WBSDetailPanel` that uses it.

### Help
- **No debounce on search**: fires API on every keystroke.
- Category chip click clears search query without warning.
- No topic counts per category.

### HelpTopic
- Section labels display as "Section 1", "Section 2" — not descriptive headings.
- Content rendered with `whiteSpace: 'pre-wrap'` but no Markdown parsing.
- No breadcrumb (Help > Category > Topic).
- No prev/next navigation.

### Reports / ReportsTab
- `Reports.tsx` and `ReportsTab.tsx` are **~140-line near-identical duplicates**.
- **No download button** for PDF/Excel/CSV reports — they show as "ready" with no access mechanism.
- **No auto-refresh/polling** for `pending`/`generating` status.
- The expand/view button only appears for `ready` + `json` format.

### AdminDashboard
- Entirely raw HTML with inline styles — visually incompatible with the main app.
- User avatar hardcoded to "AM" — not from session data.
- `getDashboardStats()` makes **5 separate API requests** to build 3 numbers.
- Active user count filters a 1-item API response — always returns 0 or 1.
- No error state rendered on failure.

### AdminLayout
- **No logout button** anywhere in either layout.
- No link back to the main application.

### UserManagement / ResourceLibrary / SupplierManagement
- **Client-side filtering on paginated data**: all three pages load `limit=20` items then filter in memory. Searching for a user in a 200-user database only finds them if they appear in the first 20 records.
- Custom toast notifications (self-managed `setTimeout`) instead of MUI Snackbar.
- `SupplierManagement` defines `FormFields` as an **inner function component** — causes React to remount the form on every parent render.

### ConfigTables
- `is_active` status field missing from the create dialog — users cannot create inactive items.
- Client-side filtering on paginated data (same as above).

### AuditLogs
- Username filter applied client-side on 20 fetched records.
- User-agent display appends `"..."` unconditionally even when the string is null or shorter than 30 chars.
- No date range filter in the UI despite the API supporting it.

---

## 4. Component Patterns

| Problem | Main App Pattern | Admin Pattern |
|---|---|---|
| Table display | MUI `Table` + `TableContainer` | Custom `DataGrid` with inline HTML |
| Modal/Dialog | MUI `Dialog` | Custom `FormDialog` (raw HTML) |
| Confirmation | `window.confirm()` | `ConfirmDialog` component |
| Search input | MUI `TextField`, no debounce | Custom `SearchBar` with debounce |
| Error feedback | `Typography color="error"` or MUI `Alert` | Custom toast with `setTimeout` |
| Success feedback | None | Custom toast with `setTimeout` |
| Loading states | `CircularProgress` in centred `Box` | Text "Loading..." |
| Status badges | MUI `Chip` | Custom HTML `span` elements |

### Missing Shared Components

- No global notification/toast system
- No shared `ErrorMessage` component
- No shared `EmptyState` component
- No shared `LoadingState` component — the same `<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>` pattern is copy-pasted across ~8 files

---

## 5. Forms & Data Entry

### AssignmentForm
- No validation that `best_estimate <= likely_estimate <= worst_estimate`.
- No field-level error messages.
- Server errors appear in the drawer behind the open dialog — invisible to the user.
- No `required` indicator (`*`) on the Resource field.

### RiskForm
- Same server-error-hidden-behind-dialog issue as AssignmentForm.
- No visual explanation why the submit button is disabled when no risk category is selected.

### Admin Forms
- Inline field-level validation is correct and consistent.
- `SupplierManagement.FormFields` is an inner component — causes unmount/remount on every render.

### Login
- No `disabled` state on submit button during async call.

---

## 6. Data Display

### WBSTree
- No ARIA `role="tree"`, `role="treeitem"`, or keyboard navigation — inaccessible to screen readers.
- Column widths hardcoded in pixels; no horizontal scroll on narrow viewports.
- No virtualisation; large projects with thousands of WBS items will be slow.

### ReportDataView
- `CostControlView` and `BOEView` tables have 8–9 columns with no overflow container — will overflow on screens narrower than ~1100px.
- `fmt()` formats numbers without a currency symbol; `EstimationSummary` uses `$` — inconsistent for the same values viewed side-by-side.

### Admin DataGrid
- Client-side sort only applies to the current page of 20 rows.

---

## 7. Missing Features & UX Gaps

1. Dead "Reports" sidebar link — navigates to non-existent `/reports` route.
2. No download button for PDF/Excel/CSV reports.
3. No polling for `pending`/`generating` report status.
4. No cross-context navigation between admin and main app.
5. No breadcrumbs in the main app.
6. No success notifications anywhere in the main app.
7. No pagination in the Projects list (hard cap at 100).
8. Login button has no loading state.
9. **No logout button** in either layout.
10. Hardcoded avatar initials "AM" in AdminLayout.
11. `window.confirm()` used for destructive actions instead of styled `ConfirmDialog`.
12. No tab URL persistence in ProjectDetail.
13. "Active Projects" stat counts archived projects.
14. Client-side filtering on paginated data across all admin list pages.
15. AssignmentForm/RiskForm errors appear behind the open dialog.
16. No three-point estimate validation (best ≤ likely ≤ worst).
17. `SupplierManagement.FormFields` defined as inner component.
18. No prev/next navigation or breadcrumb in HelpTopic.
19. Reports.tsx and ReportsTab.tsx are near-identical duplicates.

---

## 8. Prioritized Recommendations

### High Priority

**1. Fix the dead "Reports" sidebar link**
- File: `frontend/src/components/layout/Sidebar.tsx`
- Change: Remove the Reports sidebar item (reports are project-scoped) or replace it with a top-level Reports landing page listing recent reports across all projects.

**2. Add loading state to the Login button**
- File: `frontend/src/pages/Login.tsx`
- Change: Add `loading` state; `disabled={loading}` on the button; show "Signing in..." or a `CircularProgress`.

**3. Add a logout button to both layouts**
- Files: `frontend/src/components/layout/Header.tsx` and `frontend/src/pages/admin/AdminLayout.tsx`
- Change: `AccountCircle` icon in Header opens a user menu with "Logout". AdminLayout header gets a logout button. Both clear `localStorage.access_token` and navigate to `/login`.

**4. Replace `window.confirm()` with `ConfirmDialog`**
- Files: `frontend/src/pages/Projects.tsx` (line 93) and `frontend/src/components/estimation/WBSDetailPanel.tsx` (lines 149, 183)
- Change: Import and use the existing `ConfirmDialog` component for all destructive confirmations.

**5. Fix "Archive" vs "Delete" wording in Projects.tsx**
- File: `frontend/src/pages/Projects.tsx` (line 93, 98)
- Change: Message says "Archive this project?" but `deleteProject` is called. Either implement a real archive (`updateProject({ archived: true })`) or correct the message.

**6. Add report download for PDF/Excel/CSV**
- Files: `frontend/src/pages/ReportsTab.tsx`, `frontend/src/api/reports.ts`
- Change: Add a download API function; show a download icon button for `ready` non-JSON reports.

**7. Deduplicate Reports.tsx and ReportsTab.tsx**
- Files: `frontend/src/pages/Reports.tsx` and `frontend/src/pages/ReportsTab.tsx`
- Change: Extract a shared `ReportsList` component. Both pages wrap it with only structural differences (heading level, padding).

**8. Add polling for in-progress reports**
- File: `frontend/src/pages/ReportsTab.tsx`
- Change: When any report has `status === 'pending' || status === 'generating'`, poll `load()` every 5 seconds. Clear interval when all reports are settled.

**9. Fix client-side filtering on paginated data in admin pages**
- Files: `UserManagement.tsx`, `ResourceLibrary.tsx`, `SupplierManagement.tsx`, `AuditLogs.tsx`
- Change: Pass all filter criteria (`role`, `search`, `action`, `entity_type`) as API query parameters instead of filtering the returned array.

**10. Fix `SupplierManagement.FormFields` as inner component**
- File: `frontend/src/pages/admin/SupplierManagement.tsx` (line 185)
- Change: Move `const FormFields = () => (...)` outside the parent component, or inline it directly into the two `FormDialog` usages.

### Medium Priority

**11. Debounce search in Projects.tsx and Help.tsx**
- Files: `frontend/src/pages/Projects.tsx` (line 119), `frontend/src/pages/Help.tsx` (line 103)
- Change: Reuse the `SearchBar` component from `components/admin/SearchBar` which has 300ms debounce built in.

**12. Deduplicate `STATUS_COLORS`**
- Files: `frontend/src/pages/Projects.tsx` and `frontend/src/pages/ProjectDetail.tsx`
- Change: Extract to `frontend/src/constants/projectStatus.ts` and import in both.

**13. Persist active tab in URL for ProjectDetail**
- File: `frontend/src/pages/ProjectDetail.tsx`
- Change: Use a `tab` query parameter (`?tab=wbs`, `?tab=estimation`, etc.) with `useSearchParams`. Initialize from URL and update on tab change.

**14. Fix sidebar active state for nested routes**
- File: `frontend/src/components/layout/Sidebar.tsx`
- Change: Use `location.pathname.startsWith(item.path)` for the "Projects" item, or use `useMatch` from react-router-dom.

**15. Only load lookup data when entering the Estimation tab**
- File: `frontend/src/pages/ProjectDetail.tsx` (line 127)
- Change: `if (activeTab === 1 || activeTab === 3)` → `if (activeTab === 3)`. The WBS tree (tab 1) does not use lookup data.

**16. Move AssignmentForm/RiskForm errors into the dialog**
- File: `frontend/src/components/estimation/WBSDetailPanel.tsx`
- Change: Catch errors in submit handlers and pass error message as a prop to `AssignmentForm`/`RiskForm`. Display as `<Alert severity="error">` at the top of the `DialogContent`.

**17. Add three-point estimate validation**
- File: `frontend/src/components/estimation/AssignmentForm.tsx`
- Change: Before calling `onSubmit`, validate `best_estimate <= likely_estimate <= worst_estimate`. Show inline warning if violated.

**18. Add breadcrumbs to the main app**
- Files: `frontend/src/components/layout/Header.tsx` or new `Breadcrumb.tsx`
- Change: MUI `Breadcrumbs`. On `/projects/:id` show "Projects > {project_name}". On `/help/:id` show "Help > {topic.title}".

**19. Add success feedback notifications to the main app**
- Change: Introduce a global notification context (or MUI Snackbar) to show success toasts for create/save actions.

**20. Connect admin avatar to real session data**
- Files: `frontend/src/pages/admin/AdminLayout.tsx` (line 332), `frontend/src/components/layout/Header.tsx`
- Change: Store logged-in user's initials in localStorage at login time and display them in both layouts.

**21. Add cross-context navigation between admin and main app**
- Files: `frontend/src/pages/admin/AdminLayout.tsx`, `frontend/src/components/layout/Sidebar.tsx`
- Change: "Back to App" link in admin sidebar footer. "Admin" link in main app sidebar (admin-role users only).

**22. Expand the theme with missing tokens**
- File: `frontend/src/theme.ts`
- Change: Add `fontFamily`, heading weights (h1–h6), `components.MuiButton.defaultProps.disableElevation: true`, semantic palette colors for `warning`/`error`/`info`/`success` explicitly.

### Low Priority

**23. Fix "Active Projects" stat to exclude archived**
- File: `frontend/src/pages/Dashboard.tsx`
- Change: Filter by `archived: false` or rename the card "Total Projects".

**24. Add pagination to the Projects list**
- File: `frontend/src/pages/Projects.tsx`
- Change: MUI `TablePagination`. API already supports `skip`/`limit`. Default to `limit=25`.

**25. Add `is_active` to ConfigTables create dialog**
- File: `frontend/src/pages/admin/ConfigTables.tsx`
- Change: The `is_active` select exists in the edit dialog; add it to the create dialog as well.

**26. Add WBS keyboard navigation and ARIA attributes**
- File: `frontend/src/components/project/WBSTree.tsx`
- Change: `role="tree"` on container, `role="treeitem"` and `aria-expanded` on each row, arrow key navigation.

**27. Add date range filter to AuditLogs**
- File: `frontend/src/pages/admin/AuditLogs.tsx`
- Change: The `AuditLogFilter` interface already has `start_date`/`end_date`; add date inputs to the filter toolbar.

**28. Fix user-agent display truncation in AuditLogs**
- File: `frontend/src/pages/admin/AuditLogs.tsx`
- Change: `selectedLog.user_agent?.substring(0, 30)}...` → conditionally append `"..."` only when the string is actually longer than 30 chars; handle null case as `"N/A"`.

**29. Add currency symbol consistency to ReportDataView**
- File: `frontend/src/components/reports/ReportDataView.tsx`
- Change: Replace `fmt()` with `formatCurrency()` (matching `EstimationSummary`) to show `$` prefix on monetary values.

**30. Optimise `getDashboardStats` in admin.ts**
- File: `frontend/src/api/admin.ts` (lines 441–458)
- Change: Add a real `/admin/stats` backend endpoint, or at minimum fix the active user count — filtering a 1-item response always returns 0 or 1, not the true active user count.
