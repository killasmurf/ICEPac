"""Phase 4: Add approval_status to WBS table

Revision ID: 004_wbs_approval_status
Revises: 003_project_import
Create Date: 2026-01-28

Adds approval_status column to support the approval workflow state machine.
Valid values: draft, submitted, approved, rejected
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = '004_wbs_approval_status'
down_revision = '003_project_import'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add approval_status column to wbs table."""
    op.add_column(
        'wbs',
        sa.Column('approval_status', sa.String(20), nullable=False, server_default='draft')
    )


def downgrade() -> None:
    """Remove approval_status column from wbs table."""
    op.drop_column('wbs', 'approval_status')
