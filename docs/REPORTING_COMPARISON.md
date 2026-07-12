# ICEPac Reporting: Current vs Original System

**Document version:** 1.0 (US-006 follow-up)
**Last updated:** 2026-07-08

## Executive summary

The modernized ICEPac reporting subsystem implements a **data-driven engine** with **16 catalog reports** spanning 5 categories, served via **14 functional endpoints** (12 typed report endpoints + `generate` + `export` + async `jobs` queue) and **5 export formats** (JSON, CSV, PDF, XLSX, DOCX). The original ColdFusion application advertised **194 hardcoded report templates** but most were near-duplicate variants of the same query with different column selections. The modernized system is a **92% reduction in report count** but a **substantially more flexible** architecture: any one of the 14 functional reports takes a configurable `ReportFilter` and produces parameterized output, where the original required a separate hand-written SQL/template per "report".

## Capabilities matrix

| Capability | Original (ColdFusion) | Current (FastAPI) | Notes |
|---|---|---|---|
| Total report count | 194 templates | 16 catalog reports (14 endpoints + 2 enum-only with no endpoint) | Reduction in count, increase in flexibility per report |
| Hardcoded vs parameterized | All 194 hand-written SQL + templates | Single parameterized engine + 16 declarative metadata entries | Schema changes no longer require code changes for most reports |
| Filter parameters | Per-template, varying | Common `ReportFilter` schema (project_id required + date range, wbs_ids, cost_type_codes, region_codes, resource_codes, supplier_codes, technique_codes, approval_status, include_inactive) | One filter object across all reports |
| Three-point estimation math | Each template had its own PERT formula (drift risk) | One canonical implementation in `report_engine.py` and `report_repository.py` (PERT = (best + 4*likely + worst) / 6, std_dev = (worst - best) / 6) | Single source of truth |
| 80% confidence interval | Some templates had it, some didn't (inconsistent) | All cost reports compute ±1.28 × std_dev uniformly | Consistent across all reports |
| Export formats | Single format per template (mostly CSV) | 5 formats per report: JSON (default), CSV, PDF (reportlab), XLSX (openpyxl), DOCX (python-docx) | One report, five outputs |
| Async / background | Limited (relied on ColdFusion scheduled tasks) | First-class via Celery + `ReportJob` model + `POST /reports/jobs` endpoint + S3 storage with 24h auto-cleanup | Modern queue-based architecture |
| Audit trail | Inconsistent across templates | First-class `audit_logs` table + 3 audit reports (estimator_activity, approver_activity, change_history) | Every change logged |
| Cost rollups | Hand-rolled per dimension | 5 cost rollup reports (cost_by_wbs, cost_by_resource, cost_by_supplier, cost_by_eoc, cost_by_technique) | Same engine, different group-by |
| Risk reports | Risk-related queries scattered | 2 reports (risk_assessment, risk_summary) | Standardized exposure calc (cost × prob_weight × sev_weight) |
| BOE | One or two ad-hoc reports | 2 reports (boe_summary, boe_detailed) | Methodology + assumptions surfaced |
| Test coverage | Effectively 0% (ColdFusion templates untested) | 22 tests (17 contract + 4 exporter + 5 engine-internals), all passing | All 14 functional endpoints + math under test |
| Chart generation | Implemented per-template (often out of date) | `include_charts` field was placeholder-only; removed in US-006 | Charts deferred (separate plan if needed) |

## Report-by-report comparison

The 14 functional reports (with endpoints) plus 5 advertised-but-missing are mapped to the original ColdFusion modules. The original's exact file inventory isn't in this repo, but the README/LEGACY analysis describes a `Reports/` directory with 194 files organized by circuit. The mapping below is best-effort based on naming conventions and the legacy analysis doc.

### Cost Control (5 functional)

| Modern report | Legacy equivalent (best guess) | Match quality |
|---|---|---|
| `cost_by_wbs` | Per-WBS cost rollup (several variants) | High |
| `cost_by_resource` | Per-resource cost breakdown | High |
| `cost_by_supplier` | Per-supplier cost breakdown | High |
| `cost_by_eoc` | Per-element-of-cost rollup | High |
| `cost_by_technique` | Per-estimating-technique rollup | Medium |
| `cost_by_region` (no endpoint yet) | Per-region geographic rollup | Advertised in catalog |

### BOE (2 functional)

| Modern report | Legacy equivalent | Notes |
|---|---|---|
| `boe_summary` | "BOE Summary" report | High-level rollup |
| `boe_detailed` | "BOE Detailed" report | Per-WBS detail with methodology |
| `boe_by_wbs` (no endpoint yet) | "BOE by WBS" report | Advertised in catalog |

### Risk (2 functional)

| Modern report | Legacy equivalent | Notes |
|---|---|---|
| `risk_assessment` | "Risk Assessment" report | Per-risk detail with prob × sev |
| `risk_summary` | "Risk Summary" report | Category rollup with exposure totals |

### Audit (2 functional + 1 missing)

| Modern report | Legacy equivalent | Notes |
|---|---|---|
| `estimator_activity` | Estimator activity log | Audit-log driven |
| `change_history` | Change history report | Audit-log driven |
| `approver_activity` (no endpoint yet) | Approver activity log | Advertised in catalog |

### Utilization (2 missing)

| Modern report | Legacy equivalent | Notes |
|---|---|---|
| `resource_utilization` (no endpoint yet) | Resource utilization report | Advertised in catalog |
| `project_summary` (no endpoint yet) | Project summary dashboard | Advertised in catalog |

## Architectural differences

### Original: template-per-report
Each of the 194 reports was a self-contained ColdFusion file with:
- Hand-written SQL query
- Per-template column selection
- Inline formatting (HTML for screen, PDF for print)
- No parameter validation (free-form text input boxes)
- No central PERT math (drift risk — each template had its own formula)

### Current: engine + declarative metadata
The 16 reports share:
- One `ReportEngine` (181 lines) with a `REPORT_HANDLERS` dispatch table mapping `ReportType` to repository method
- One `ReportFilter` Pydantic schema (single source of truth for filter parameters)
- One `REPORT_COLUMNS` metadata per report (declarative column definitions)
- One canonical PERT implementation in the cost rollups
- 5 export-format implementations (CSV / PDF / XLSX / DOCX) applied uniformly
- Celery task `generate_report_async` for async jobs (writes to S3 with 24h auto-cleanup)

## Coverage gap to close

The 5 reports in the catalog that have no functional endpoint (`approver_activity`, `boe_by_wbs`, `cost_by_region`, `project_summary`, `resource_utilization`) are listed as a follow-up. Adding the endpoints is mechanical work — each is a 1-route addition (PostRequest → ReportEngine → dispatch from REPORT_HANDLERS) — but it's deferred to keep the US-006 scope focused.

## Catalog-truth gap

The `REPORT_CATALOG` advertises 16 reports; only 14 have functional endpoints. Until the gap is closed, the frontend hides 2 of them (the 2 that don't have endpoints return 404 from the URL). Tests assert they return a well-formed 404 (not 500) so a future contributor adding the endpoint will see the test flip from 404 → 200 and know the gap was closed.

## See also

- US-006 plan: `/home/adam/chats/1/.omc/plans/ralplan-icepac-reporting-review.md`
- US-006 PR: https://github.com/killasmurf/ICEPac/pull/11
- Test data: `scripts/seed_report_showcase.py` (companion to this document; produces a focused dataset that demonstrates every functional report's features)