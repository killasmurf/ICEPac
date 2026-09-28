"""Phase 5: Report tables

Revision ID: 005_report_tables
Revises: 004_wbs_approval_status
Create Date: 2026-09-28

Creates the generated_reports table for the Reports Circuit.
"""
import sqlalchemy as sa
from alembic import op

revision = '005_report_tables'
down_revision = '004_wbs_approval_status'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'generated_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('requested_by', sa.Integer(), nullable=True),
        sa.Column('report_type', sa.String(50), nullable=False),
        sa.Column('report_format', sa.String(20), nullable=False, server_default='json'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('s3_key', sa.String(1000), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_reports_project_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], name='fk_reports_requested_by', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_generated_reports_id', 'generated_reports', ['id'])
    op.create_index('ix_generated_reports_project_id', 'generated_reports', ['project_id'])
    op.create_index('ix_generated_reports_status', 'generated_reports', ['status'])
    op.create_index('ix_generated_reports_created_at', 'generated_reports', ['created_at'])


def downgrade() -> None:
    op.drop_table('generated_reports')
