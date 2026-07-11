"""Add the new AuditLog model fields (old_values, new_values, user_agent, created_at) and is_active on the weighted lookup tables (probability_levels, severity_levels).

PR #11's migration 007 added is_active to 7 of the 9 lookup tables
(model: ConfigTableMixin). It missed probability_levels and
severity_levels (model: WeightedConfigTableMixin which also extends
ConfigTableMixin and so also has is_active).

This migration also backfills the audit_logs columns that the
AuditLog model expects but the original 005_report_tables migration
didn't create (old_values, new_values, user_agent). The `timestamp`
column is renamed to `created_at` to match the model attribute name.

Targets:
  - probability_levels, severity_levels: add is_active
  - audit_logs: add old_values, new_values, user_agent; rename
    timestamp → created_at
"""
from alembic import op

revision = "008_audit_log_lookups"
down_revision = "007_backfill"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Weighted lookup tables (model: WeightedConfigTableMixin)
    for t in ("probability_levels", "severity_levels"):
        op.execute(
            f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"
        )
        op.execute(f"UPDATE {t} SET is_active = true WHERE is_active IS NULL")
        op.execute(f"ALTER TABLE {t} ALTER COLUMN is_active SET NOT NULL")

    # AuditLogs: add the JSON / TEXT columns the model expects,
    # then rename the timestamp column to match the model attribute.
    # Rename first while the column is empty of FK references.
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB")
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB")
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT")
    # Some versions of 005_report_tables have timestamp; others have
    # created_at. Try the rename idempotently.
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_name='audit_logs' AND column_name='timestamp') THEN "
        "ALTER TABLE audit_logs RENAME COLUMN timestamp TO created_at; "
        "END IF; "
        "END $$"
    )


def downgrade() -> None:
    # Reverse: rename created_at back to timestamp, drop the JSON/TEXT
    for t in ("probability_levels", "severity_levels"):
        op.drop_column(t, "is_active")
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_name='audit_logs' AND column_name='created_at') THEN "
        "ALTER TABLE audit_logs RENAME COLUMN created_at TO timestamp; "
        "END IF; "
        "END $$"
    )
    for col in ("old_values", "new_values", "user_agent"):
        op.drop_column("audit_logs", col)
