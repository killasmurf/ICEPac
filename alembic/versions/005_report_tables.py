"""Phase 5: Report jobs table

Revision ID: 005_report_tables
Revises: 004_wbs_approval_status
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "005_report_tables"
down_revision = "004_wbs_approval_status"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "report_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("parameters", JSONB(), nullable=True),
        sa.Column("result_summary", JSONB(), nullable=True),
        sa.Column("output_format", sa.String(10), nullable=False, server_default="json"),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("row_count", sa.Integer(), server_default="0"),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_report_jobs_user", "report_jobs", ["user_id"])
    op.create_index("ix_report_jobs_status", "report_jobs", ["status"])
    op.create_index("ix_report_jobs_type", "report_jobs", ["report_type"])


def downgrade():
    op.drop_table("report_jobs")
