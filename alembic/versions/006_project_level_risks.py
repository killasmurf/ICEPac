"""Add project-level risk fields (nullable project_id, title, status, XOR check constraint)

Revision ID: 006_project_level_risks
Revises: 005_report_tables
Create Date: 2026-07-09

Adds support for project-level risks (distinct from WBS-scoped risks):

  - nullable project_id FK to projects.id
  - title (String 255, NOT NULL)
  - status (String 32, default 'open')
  - relaxes wbs_id from NOT NULL to nullable (project-scoped risks
    leave it NULL)
  - adds ck_risk_xor_parent CHECK constraint enforcing exactly-one-of
    (wbs_id, project_id) at the DB layer

The XOR invariant is load-bearing for the design. Without it, a buggy
INSERT could produce orphan or double-counted risks that silently break
the total-cost aggregates. Enforcing at the DB layer (not just in
application code) makes the constraint un-bypassable.

The existing 21 WBS-scoped risks on this codebase need their title
column backfilled with a placeholder (e.g. '(legacy WBS-scoped risk
#N)') before the NOT NULL constraint on title can be applied.
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "006_project_level_risks"
down_revision = "005_report_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add nullable project_id column + FK + index
    op.add_column(
        "risks",
        sa.Column("project_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_risks_project_id_projects",
        "risks",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_risks_project_id", "risks", ["project_id"])

    # 2. Add nullable status column with server_default
    op.add_column(
        "risks",
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=True,
            server_default="open",
        ),
    )
    # Backfill any NULL statuses
    op.execute("UPDATE risks SET status = 'open' WHERE status IS NULL")
    op.alter_column("risks", "status", nullable=False)

    # 3. Add nullable title column, backfill, then make NOT NULL
    op.add_column(
        "risks",
        sa.Column("title", sa.String(length=255), nullable=True),
    )
    # Backfill placeholder titles for any existing WBS-scoped risks.
    op.execute(
        "UPDATE risks SET title = '(legacy WBS-scoped risk #' || id || ')' "
        "WHERE title IS NULL"
    )
    op.alter_column("risks", "title", nullable=False)

    # 4. Relax wbs_id from NOT NULL to nullable (required so project-scoped
    # risks with project_id set can have wbs_id=NULL)
    op.alter_column("risks", "wbs_id", nullable=True)

    # 5. CHECK constraint enforcing the XOR invariant at the DB layer
    op.create_check_constraint(
        "ck_risk_xor_parent",
        "risks",
        "(wbs_id IS NOT NULL) <> (project_id IS NOT NULL)",
    )


def downgrade() -> None:
    # Reverse in opposite order. WARNING: only safe while there are zero
    # project-level risks. If project-level risks exist, the downgrade
    # will fail at the title NOT NULL step (project-level risks were inserted
    # with real titles, so the column won't go back to NULL) or, if those
    # rows are deleted first, the project_id column drop will lose data.
    op.drop_constraint("ck_risk_xor_parent", "risks", type_="check")
    op.alter_column("risks", "wbs_id", nullable=False)
    op.alter_column("risks", "title", nullable=True)
    op.drop_column("risks", "status")
    op.drop_index("ix_risks_project_id", table_name="risks")
    op.drop_constraint("fk_risks_project_id_projects", "risks", type_="foreignkey")
    op.drop_column("risks", "project_id")
