"""Phase 3: Project, WBS, Import, Assignment, and Risk Tables

Revision ID: 003_project_import
Revises: 002_admin_tables
Create Date: 2026-01-28

Creates all project-related tables with full Phase 3 support:
- projects: Project metadata with MS Project import tracking
- wbs: Work Breakdown Structure with hierarchy and task flags
- import_jobs: Async import job tracking
- resource_assignments: Three-point cost estimation per WBS item
- risks: Risk register per WBS item
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = '003_project_import'
down_revision = '002_admin_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create project, WBS, import, assignment, and risk tables."""

    # ================================================================
    # PostgreSQL Enum Types
    # ================================================================
    op.execute("CREATE TYPE projectstatus AS ENUM ('draft', 'importing', 'imported', 'import_failed', 'active', 'archived')")
    op.execute("CREATE TYPE projectsourceformat AS ENUM ('mpp', 'mpx', 'xml', 'manual')")
    op.execute("CREATE TYPE importstatus AS ENUM ('pending', 'uploading', 'parsing', 'creating_records', 'completed', 'failed')")

    # ================================================================
    # Projects Table
    # ================================================================
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_name', sa.String(255), nullable=False),
        sa.Column('project_manager', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('archived', sa.Boolean(), nullable=False, server_default='false'),
        # Source file tracking (Phase 3)
        sa.Column('source_file', sa.String(500), nullable=True),
        sa.Column('source_format', sa.Enum('mpp', 'mpx', 'xml', 'manual', name='projectsourceformat', create_type=False), nullable=True),
        sa.Column('s3_key', sa.String(1000), nullable=True),
        sa.Column('status', sa.Enum('draft', 'importing', 'imported', 'import_failed', 'active', 'archived', name='projectstatus', create_type=False), nullable=False, server_default='draft'),
        # Project schedule dates
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('finish_date', sa.DateTime(), nullable=True),
        sa.Column('baseline_start', sa.DateTime(), nullable=True),
        sa.Column('baseline_finish', sa.DateTime(), nullable=True),
        # Cached counts
        sa.Column('task_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resource_count', sa.Integer(), nullable=False, server_default='0'),
        # Owner
        sa.Column('owner_id', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_projects_owner_id', ondelete='SET NULL'),
    )
    op.create_index('ix_projects_id', 'projects', ['id'])
    op.create_index('ix_projects_project_name', 'projects', ['project_name'])
    op.create_index('ix_projects_status', 'projects', ['status'])

    # ================================================================
    # WBS Table
    # ================================================================
    op.create_table(
        'wbs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('task_unique_id', sa.Integer(), nullable=True),
        sa.Column('wbs_code', sa.String(100), nullable=True),
        sa.Column('wbs_title', sa.String(500), nullable=False),
        # Hierarchy
        sa.Column('outline_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        # Schedule dates
        sa.Column('schedule_start', sa.DateTime(), nullable=True),
        sa.Column('schedule_finish', sa.DateTime(), nullable=True),
        sa.Column('baseline_start', sa.DateTime(), nullable=True),
        sa.Column('baseline_finish', sa.DateTime(), nullable=True),
        sa.Column('late_start', sa.DateTime(), nullable=True),
        sa.Column('late_finish', sa.DateTime(), nullable=True),
        sa.Column('actual_start', sa.DateTime(), nullable=True),
        sa.Column('actual_finish', sa.DateTime(), nullable=True),
        # Duration
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('duration_units', sa.String(20), nullable=True),
        # Progress
        sa.Column('percent_complete', sa.Float(), nullable=True, server_default='0'),
        # Cost
        sa.Column('cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('baseline_cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        # Task classification flags
        sa.Column('is_milestone', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_summary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_critical', sa.Boolean(), nullable=False, server_default='false'),
        # Display cache
        sa.Column('resource_names', sa.String(1000), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        # Estimation fields (legacy)
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('assumptions', sa.Text(), nullable=True),
        sa.Column('approver', sa.String(255), nullable=True),
        sa.Column('approver_date', sa.DateTime(), nullable=True),
        sa.Column('estimate_revision', sa.Integer(), nullable=True, server_default='0'),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_wbs_project_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['wbs.id'], name='fk_wbs_parent_id', ondelete='SET NULL'),
    )
    op.create_index('ix_wbs_id', 'wbs', ['id'])
    op.create_index('ix_wbs_project_id', 'wbs', ['project_id'])
    op.create_index('ix_wbs_parent_id', 'wbs', ['parent_id'])
    op.create_index('ix_wbs_task_unique_id', 'wbs', ['task_unique_id'])

    # ================================================================
    # Import Jobs Table
    # ================================================================
    op.create_table(
        'import_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        # File info
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('s3_key', sa.String(1000), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        # Status tracking
        sa.Column('status', sa.Enum('pending', 'uploading', 'parsing', 'creating_records', 'completed', 'failed', name='importstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('progress', sa.Float(), nullable=False, server_default='0'),
        sa.Column('celery_task_id', sa.String(255), nullable=True),
        # Result counts
        sa.Column('task_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resource_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('assignment_count', sa.Integer(), nullable=False, server_default='0'),
        # Error tracking
        sa.Column('error_message', sa.Text(), nullable=True),
        # Timestamps
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_import_jobs_project_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_import_jobs_user_id'),
    )
    op.create_index('ix_import_jobs_id', 'import_jobs', ['id'])
    op.create_index('ix_import_jobs_project_id', 'import_jobs', ['project_id'])
    op.create_index('ix_import_jobs_user_id', 'import_jobs', ['user_id'])
    op.create_index('ix_import_jobs_status', 'import_jobs', ['status'])
    op.create_index('ix_import_jobs_celery_task_id', 'import_jobs', ['celery_task_id'])

    # ================================================================
    # Resource Assignments Table
    # ================================================================
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
        # Three-point estimation
        sa.Column('best_estimate', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('likely_estimate', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('worst_estimate', sa.Numeric(18, 2), nullable=True, server_default='0'),
        # Tracking percentages
        sa.Column('duty_pct', sa.Numeric(5, 2), nullable=True, server_default='100'),
        sa.Column('import_content_pct', sa.Numeric(5, 2), nullable=True, server_default='0'),
        sa.Column('aii_pct', sa.Numeric(5, 2), nullable=True, server_default='0'),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wbs_id'], ['wbs.id'], name='fk_assignments_wbs_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_code'], ['resources.resource_code'], name='fk_assignments_resource_code'),
        sa.ForeignKeyConstraint(['supplier_code'], ['suppliers.supplier_code'], name='fk_assignments_supplier_code'),
        sa.ForeignKeyConstraint(['cost_type_code'], ['cost_types.code'], name='fk_assignments_cost_type'),
        sa.ForeignKeyConstraint(['region_code'], ['regions.code'], name='fk_assignments_region'),
        sa.ForeignKeyConstraint(['bus_area_code'], ['business_areas.code'], name='fk_assignments_bus_area'),
        sa.ForeignKeyConstraint(['estimating_technique_code'], ['estimating_techniques.code'], name='fk_assignments_est_technique'),
    )
    op.create_index('ix_resource_assignments_id', 'resource_assignments', ['id'])
    op.create_index('ix_resource_assignments_wbs_id', 'resource_assignments', ['wbs_id'])

    # ================================================================
    # Risks Table
    # ================================================================
    op.create_table(
        'risks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wbs_id', sa.Integer(), nullable=False),
        sa.Column('risk_category_code', sa.String(50), nullable=True),
        sa.Column('risk_cost', sa.Numeric(18, 2), nullable=True, server_default='0'),
        sa.Column('probability_code', sa.String(50), nullable=True),
        sa.Column('severity_code', sa.String(50), nullable=True),
        sa.Column('mitigation_plan', sa.Text(), nullable=True),
        sa.Column('date_identified', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wbs_id'], ['wbs.id'], name='fk_risks_wbs_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['risk_category_code'], ['risk_categories.code'], name='fk_risks_category'),
        sa.ForeignKeyConstraint(['probability_code'], ['probability_levels.code'], name='fk_risks_probability'),
        sa.ForeignKeyConstraint(['severity_code'], ['severity_levels.code'], name='fk_risks_severity'),
    )
    op.create_index('ix_risks_id', 'risks', ['id'])
    op.create_index('ix_risks_wbs_id', 'risks', ['wbs_id'])


def downgrade() -> None:
    """Drop project, WBS, import, assignment, and risk tables."""
    # Drop in reverse dependency order
    op.drop_table('risks')
    op.drop_table('resource_assignments')
    op.drop_table('import_jobs')
    op.drop_table('wbs')
    op.drop_table('projects')

    # Drop enum types
    op.execute('DROP TYPE importstatus')
    op.execute('DROP TYPE projectsourceformat')
    op.execute('DROP TYPE projectstatus')
