"""
Help topic seeder for ICEPac.

Idempotent: skips a topic if its title already exists. Safe to re-run
without duplicating.

This is a focused follow-up to PR #11 (reporting fix). The previous
\`scripts/seed_demo.py\` (which was the single place help topics were
seeded) was discarded during the project-risk squash-merge on the
\`ralph/user-testing-readiness\` branch. This file replaces JUST the
help-topic portion of that script so we can add the missing "Reports"
help topic without re-seeding the entire demo dataset.

For the full demo seed (project, WBS, assignments, risks, etc.),
see the existing scripts/README.md and run:
  docker compose -f docker-compose.yml -f docker-compose.demo.yml
  --profile demo up -d --force-recreate
to bring up a fresh demo with the full seed.

To add just help topics to an existing DB:
  docker exec <container> python scripts/seed_help.py
"""
import os
import sys

# Ensure the project root is on sys.path so `from app.X import Y` works
# regardless of how the script is invoked. Idempotent: no-op if already
# there.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from app.core.database import SessionLocal
from app.models.database.help import HelpCategory, HelpTopic

REPORTS_HELP_CONTENT = """\
The Reports page at /reports generates the 14 report types with active
endpoints (out of 16 advertised in the catalog; the gap is documented
in the user-testing-readiness plan as a follow-up).

**What each category answers:**

  - **Cost Control** (cost_by_wbs, cost_by_resource, cost_by_supplier,
    cost_by_eoc, cost_by_technique): "How much money is committed to
    each scope element, resource, supplier, etc.?" PERT-weighted
    estimates with 80% confidence intervals.
  - **Basis of Estimate** (boe_summary, boe_detailed): "What's the
    methodology and assumptions behind the numbers?" High-level rollup
    or per-WBS detail.
  - **Risk** (risk_assessment, risk_summary): "What risks are open and
    what's our dollar exposure?" Per-risk detail or category rollup.
  - **Audit** (estimator_activity, approver_activity, change_history):
    "Who did what, when?" Audit-log-driven.
  - **Utilization** (resource_utilization, project_summary):
    "How are resources being used across projects?" (NB: these two
    reports are advertised in the catalog but have no /reports/{type}
    endpoint as of US-006; calling them returns a 404.)

**Filters:**

  - project_id (required): every report is scoped to a single project
  - date_from / date_to: optional date range
  - wbs_ids / cost_type_codes / region_codes / resource_codes /
    supplier_codes / technique_codes: optional include-filters
  - approval_status: optional filter on WBS approval state
  - include_inactive: defaults to False (set True to include
    deactivated records)

**Export formats (5):**

  - **JSON** — raw data; best for downstream tooling
  - **CSV** — spreadsheet-friendly; best for ad-hoc analysis
  - **PDF** (via reportlab) — stakeholder-ready; landscape A4 with
    title, project name, generated-at, row count, then a table
  - **XLSX** (via openpyxl) — Excel-native; styled header row
  - **DOCX** (via python-docx) — Word-native; editable for mark-up

**Async jobs:**

  POST /api/v1/reports/jobs queues a Celery task that generates the
  report in the background and uploads the file to S3. Useful for
  large exports that would block the request thread. The job
  lifecycle: pending -> generating -> completed -> expired (24h
  auto-cleanup) or failed. Use GET /api/v1/reports/jobs/{id} to
  poll status.

**The \`include_charts\` field was removed in US-006.** It was a
placeholder for a chart-generation feature that was never built; the
engine silently ignored it. The field is gone from the request
schema and the OpenAPI spec at /openapi.json.

**Out of scope (deferred follow-ups):**

  - Charts (re-enablement, if stakeholders explicitly ask)
  - The 2 catalog entries without endpoints (resource_utilization,
    project_summary) — closing this gap will flip the corresponding
    tests from 404 to 200
  - Decomposition of the 181-line \`ReportEngine\` god class
"""


def seed_reports_help_topic():
    """Add the 'Reports' help topic under the existing 'Admin Guide' category.

    Idempotent: skips if a topic with this title already exists in the
    'Admin Guide' category.
    """
    db = SessionLocal()
    try:
        admin_guide = (
            db.query(HelpCategory)
            .filter(HelpCategory.name == "Admin Guide")
            .one_or_none()
        )
        if admin_guide is None:
            print("ERROR: 'Admin Guide' category not found.")
            print("       (Was the demo fully seeded? Run scripts/seed_demo.py")
            print(
                "        or bring up the demo stack via docker compose --profile demo up -d)"
            )
            return False

        existing = (
            db.query(HelpTopic)
            .filter(
                HelpTopic.category_id == admin_guide.id,
                HelpTopic.title == "Reports",
            )
            .one_or_none()
        )
        if existing is not None:
            print(
                "'Reports' help topic already exists (id={}). Skipping.".format(
                    existing.id
                )
            )
            return False

        # Find the current max display_order under Admin Guide so the new
        # topic appears last.
        max_order = (
            db.query(HelpTopic)
            .filter(HelpTopic.category_id == admin_guide.id)
            .order_by(HelpTopic.display_order.desc())
            .first()
        )
        next_order = (max_order.display_order + 1) if max_order else 1

        db.add(
            HelpTopic(
                category_id=admin_guide.id,
                title="Reports",
                content=REPORTS_HELP_CONTENT,
                display_order=next_order,
                is_active=True,
            )
        )
        db.commit()
        print(
            "Added 'Reports' help topic under 'Admin Guide' (display_order={}).".format(
                next_order
            )
        )
        return True
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(0 if seed_reports_help_topic() else 1)
