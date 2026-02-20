"""Add all remaining tables: config lookups, projects, WBS, resources,
suppliers, assignments, risks, audit_log.

Revision ID: 002_remaining_tables
Revises: a41d9a15aea8
Create Date: 2026-02-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002_remaining_tables'
down_revision: Union[str, None] = 'a41d9a15aea8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Lookup / config tables
    # ------------------------------------------------------------------
    for table_name in (
        'cost_types', 'expense_types', 'regions', 'business_areas',
        'estimating_techniques', 'risk_categories', 'expenditure_indicators',
    ):
        op.create_table(
            table_name,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(50), nullable=False),
            sa.Column('description', sa.String(255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(f'ix_{table_name}_id', table_name, ['id'])
        op.create_index(f'ix_{table_name}_code', table_name, ['code'], unique=True)

    # Weighted lookup tables
    for table_name in ('probability_levels', 'severity_levels'):
        op.create_table(
            table_name,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(50), nullable=False),
            sa.Column('description', sa.String(255), nullable=False),
            sa.Column('weight', sa.Numeric(5, 2), nullable=True, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(f'ix_{table_name}_id', table_name, ['id'])
        op.create_index(f'ix_{table_name}_code', table_name, ['code'], unique=True)

    op.create_table(
        'pmb_weights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('weight', sa.Numeric(5, 4), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pmb_weights_id', 'pmb_weights', ['id'])
    op.create_index('ix_pmb_weights_code', 'pmb_weights', ['code'], unique=True)

    # ------------------------------------------------------------------
    # Resources and suppliers
    # ------------------------------------------------------------------
    op.create_table(
        'resources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_code', sa.String(50), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('eoc', sa.String(100), nullable=True),
        sa.Column('cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('units', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_resources_id', 'resources', ['id'])
    op.create_index('ix_resources_resource_code', 'resources', ['resource_code'], unique=True)

    op.create_table(
        'suppliers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('supplier_code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('contact', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_suppliers_id', 'suppliers', ['id'])
    op.create_index('ix_suppliers_supplier_code', 'suppliers', ['supplier_code'], unique=True)

    # ------------------------------------------------------------------
    # Projects
    # ------------------------------------------------------------------
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_name', sa.String(255), nullable=False),
        sa.Column('project_manager', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_projects_id', 'projects', ['id'])
    op.create_index('ix_projects_project_name', 'projects', ['project_name'])

    # ------------------------------------------------------------------
    # WBS
    # ------------------------------------------------------------------
    op.create_table(
        'wbs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('task_unique_id', sa.Integer(), nullable=True),
        sa.Column('wbs_code', sa.String(100), nullable=True),
        sa.Column('wbs_title', sa.String(500), nullable=False),
        sa.Column('schedule_start', sa.DateTime(), nullable=True),
        sa.Column('schedule_finish', sa.DateTime(), nullable=True),
        sa.Column('baseline_start', sa.DateTime(), nullable=True),
        sa.Column('baseline_finish', sa.DateTime(), nullable=True),
        sa.Column('late_start', sa.DateTime(), nullable=True),
        sa.Column('late_finish', sa.DateTime(), nullable=True),
        sa.Column('cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('baseline_cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('assumptions', sa.Text(), nullable=True),
        sa.Column('approver', sa.String(255), nullable=True),
        sa.Column('approver_date', sa.DateTime(), nullable=True),
        sa.Column('estimate_revision', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_wbs_id', 'wbs', ['id'])
    op.create_index('ix_wbs_project_id', 'wbs', ['project_id'])
    op.create_index('ix_wbs_task_unique_id', 'wbs', ['task_unique_id'])

    # ------------------------------------------------------------------
    # Resource assignments
    # ------------------------------------------------------------------
    op.create_table(
        'resource_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wbs_id', sa.Integer(), nullable=False),
        sa.Column('resource_code', sa.String(50), nullable=False),
        sa.Column('supplier_code', sa.String(50), nullable=True),
        sa.Column('cost_type_code', sa.String(50), nullable=True),
        sa.Column('region_code', sa.String(50), nullable=True),
        sa.Column('bus_area_code', sa.String(50), nullable=True),
        sa.Column('estimating_technique_code', sa.String(50), nullable=True),
        sa.Column('best_estimate', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('likely_estimate', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('worst_estimate', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('duty_pct', sa.Numeric(5, 2), nullable=True, server_default='100'),
        sa.Column('import_content_pct', sa.Numeric(5, 2), nullable=True, server_default='0'),
        sa.Column('aii_pct', sa.Numeric(5, 2), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['wbs_id'], ['wbs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_code'], ['resources.resource_code']),
        sa.ForeignKeyConstraint(['supplier_code'], ['suppliers.supplier_code']),
        sa.ForeignKeyConstraint(['cost_type_code'], ['cost_types.code']),
        sa.ForeignKeyConstraint(['region_code'], ['regions.code']),
        sa.ForeignKeyConstraint(['bus_area_code'], ['business_areas.code']),
        sa.ForeignKeyConstraint(['estimating_technique_code'], ['estimating_techniques.code']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_resource_assignments_id', 'resource_assignments', ['id'])
    op.create_index('ix_resource_assignments_wbs_id', 'resource_assignments', ['wbs_id'])

    # ------------------------------------------------------------------
    # Risks
    # ------------------------------------------------------------------
    op.create_table(
        'risks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wbs_id', sa.Integer(), nullable=False),
        sa.Column('risk_category_code', sa.String(50), nullable=True),
        sa.Column('risk_cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('probability_code', sa.String(50), nullable=True),
        sa.Column('severity_code', sa.String(50), nullable=True),
        sa.Column('mitigation_plan', sa.Text(), nullable=True),
        sa.Column('date_identified', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['wbs_id'], ['wbs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['risk_category_code'], ['risk_categories.code']),
        sa.ForeignKeyConstraint(['probability_code'], ['probability_levels.code']),
        sa.ForeignKeyConstraint(['severity_code'], ['severity_levels.code']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_risks_id', 'risks', ['id'])
    op.create_index('ix_risks_wbs_id', 'risks', ['wbs_id'])

    # ------------------------------------------------------------------
    # Audit log
    # ------------------------------------------------------------------
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('username', sa.String(100), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=True),
        sa.Column('entity_id', sa.String(100), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_log_id', 'audit_log', ['id'])
    op.create_index('ix_audit_log_user_id', 'audit_log', ['user_id'])


def downgrade() -> None:
    for t in ('audit_log', 'risks', 'resource_assignments', 'wbs', 'projects',
              'suppliers', 'resources', 'pmb_weights', 'probability_levels',
              'severity_levels', 'expenditure_indicators', 'risk_categories',
              'estimating_techniques', 'business_areas', 'regions',
              'expense_types', 'cost_types'):
        op.drop_table(t)
