"""Backfill columns that the model has but the original migrations didn't create.

Three models added columns after the original migrations shipped. This
single migration adds them all in one place to avoid the model/schema
drift that caused PR #11's reporting tests to fail against stale
databases (business_areas.is_active, projects.source_file, etc.).

  - Lookup tables (model: ConfigTableMixin): is_active
  - Project model: source_file, source_format, s3_key, status,
    start_date, finish_date, baseline_start, baseline_finish,
    task_count, resource_count, owner_id
  - WBS model: outline_level, parent_id, actual_start, actual_finish,
    duration, duration_units, percent_complete, is_milestone,
    is_summary, is_critical, resource_names, notes, requirements,
    approver_date, estimate_revision, approval_status
  - Risk model: title, status, project_id (the last is the project-level
    risk FK)
"""
from alembic import op

revision = "007_backfill"
down_revision = "006_project_level_risks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Lookup tables (model: ConfigTableMixin)
    for t in (
        "cost_types",
        "expense_types",
        "regions",
        "business_areas",
        "estimating_techniques",
        "risk_categories",
        "expenditure_indicators",
    ):
        op.execute(
            f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"
        )
        op.execute(f"UPDATE {t} SET is_active = true WHERE is_active IS NULL")
        op.execute(f"ALTER TABLE {t} ALTER COLUMN is_active SET NOT NULL")

    # Project model additions
    for col, sqltype in [
        ("source_file", "VARCHAR(500)"),
        ("source_format", "VARCHAR(50)"),
        ("s3_key", "VARCHAR(1000)"),
        ("status", "VARCHAR(50)"),
        ("start_date", "TIMESTAMP"),
        ("finish_date", "TIMESTAMP"),
        ("baseline_start", "TIMESTAMP"),
        ("baseline_finish", "TIMESTAMP"),
        ("task_count", "INTEGER DEFAULT 0"),
        ("resource_count", "INTEGER DEFAULT 0"),
        ("owner_id", "INTEGER"),
    ]:
        op.execute(f"ALTER TABLE projects ADD COLUMN IF NOT EXISTS {col} {sqltype}")

    # WBS model additions
    for col, sqltype in [
        ("outline_level", "INTEGER DEFAULT 0"),
        ("parent_id", "INTEGER"),
        ("actual_start", "TIMESTAMP"),
        ("actual_finish", "TIMESTAMP"),
        ("duration", "NUMERIC"),
        ("duration_units", "VARCHAR(50)"),
        ("percent_complete", "NUMERIC DEFAULT 0"),
        ("is_milestone", "BOOLEAN DEFAULT false"),
        ("is_summary", "BOOLEAN DEFAULT false"),
        ("is_critical", "BOOLEAN DEFAULT false"),
        ("resource_names", "VARCHAR"),
        ("notes", "TEXT"),
        ("requirements", "TEXT"),
        ("approver_date", "TIMESTAMP"),
        ("estimate_revision", "INTEGER DEFAULT 0"),
        ("approval_status", "VARCHAR(50) DEFAULT 'draft'"),
    ]:
        op.execute(f"ALTER TABLE wbs ADD COLUMN IF NOT EXISTS {col} {sqltype}")

    # Risk model additions (project_id FK + title + status)
    op.execute("ALTER TABLE risks ADD COLUMN IF NOT EXISTS title VARCHAR(255)")
    op.execute(
        "UPDATE risks SET title = '(legacy WBS-scoped risk #' || id || ')' "
        "WHERE title IS NULL"
    )
    op.execute("ALTER TABLE risks ALTER COLUMN title SET NOT NULL")
    op.execute(
        "ALTER TABLE risks ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'open'"
    )
    op.execute("UPDATE risks SET status = 'open' WHERE status IS NULL")
    op.execute("ALTER TABLE risks ALTER COLUMN status SET NOT NULL")
    op.execute("ALTER TABLE risks ADD COLUMN IF NOT EXISTS project_id INTEGER")


def downgrade() -> None:
    for t in (
        "cost_types",
        "expense_types",
        "regions",
        "business_areas",
        "estimating_techniques",
        "risk_categories",
        "expenditure_indicators",
    ):
        op.drop_column(t, "is_active")
    for col in (
        "source_file",
        "source_format",
        "s3_key",
        "status",
        "start_date",
        "finish_date",
        "baseline_start",
        "baseline_finish",
        "task_count",
        "resource_count",
        "owner_id",
    ):
        op.drop_column("projects", col)
    for col in (
        "outline_level",
        "parent_id",
        "actual_start",
        "actual_finish",
        "duration",
        "duration_units",
        "percent_complete",
        "is_milestone",
        "is_summary",
        "is_critical",
        "resource_names",
        "notes",
        "requirements",
        "approver_date",
        "estimate_revision",
        "approval_status",
    ):
        op.drop_column("wbs", col)
    for col in ("title", "status", "project_id"):
        op.drop_column("risks", col)
