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
        'tblProjects',
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
        sa.ForeignKeyConstraint(['owner_id'], ['tblUsers.id'], name='fk_projects_owner_id', ondelete='SET NULL'),
    )
    op.create_index('ix_projects_id', 'tblProjects', ['id'])
    op.create_index('ix_projects_project_name', 'tblProjects', ['project_name'])
    op.create_index('ix_projects_status', 'tblProjects', ['status'])

    # ================================================================
    # WBS Table
    # ================================================================
    op.create_table(
        'tblWBS',
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
        sa.ForeignKeyConstraint(['project_id'], ['tblProjects.id'], name='fk_wbs_project_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['tblWBS.id'], name='fk_wbs_parent_id', ondelete='SET NULL'),
    )
    op.create_index('ix_wbs_id', 'tblWBS', ['id'])
    op.create_index('ix_wbs_project_id', 'tblWBS', ['project_id'])
    op.create_index('ix_wbs_parent_id', 'tblWBS', ['parent_id'])
    op.create_index('ix_wbs_task_unique_id', 'tblWBS', ['task_unique_id'])

    # ================================================================
    # Import Jobs Table
    # ================================================================
    op.create_table(
        'tblImportJobs',
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
        sa.ForeignKeyConstraint(['project_id'], ['tblProjects.id'], name='fk_import_jobs_project_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['tblUsers.id'], name='fk_import_jobs_user_id'),
    )
    op.create_index('ix_import_jobs_id', 'tblImportJobs', ['id'])
    op.create_index('ix_import_jobs_project_id', 'tblImportJobs', ['project_id'])
    op.create_index('ix_import_jobs_user_id', 'tblImportJobs', ['user_id'])
    op.create_index('ix_import_jobs_status', 'tblImportJobs', ['status'])
    op.create_index('ix_import_jobs_celery_task_id', 'tblImportJobs', ['celery_task_id'])

    # ================================================================
    # Resource Assignments Table
    # ================================================================
    op.create_table(
        'tblResourceAssignment',
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
        sa.ForeignKeyConstraint(['wbs_id'], ['tblWBS.id'], name='fk_assignments_wbs_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_code'], ['tblResource.resource_code'], name='fk_assignments_resource_code'),
        sa.ForeignKeyConstraint(['supplier_code'], ['tblSupplier.supplier_code'], name='fk_assignments_supplier_code'),
        sa.ForeignKeyConstraint(['cost_type_code'], ['tblCostType.code'], name='fk_assignments_cost_type'),
        sa.ForeignKeyConstraint(['region_code'], ['tblRegion.code'], name='fk_assignments_region'),
        sa.ForeignKeyConstraint(['bus_area_code'], ['tblBus_Area.code'], name='fk_assignments_bus_area'),
        sa.ForeignKeyConstraint(['estimating_technique_code'], ['tblEstimatingTechnique.code'], name='fk_assignments_est_technique'),
    )
    op.create_index('ix_resource_assignments_id', 'tblResourceAssignment', ['id'])
    op.create_index('ix_resource_assignments_wbs_id', 'tblResourceAssignment', ['wbs_id'])

    # ================================================================
    # Risks Table
    # ================================================================
    op.create_table(
        'tblRisks',
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
        sa.ForeignKeyConstraint(['wbs_id'], ['tblWBS.id'], name='fk_risks_wbs_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['risk_category_code'], ['tblRiskCategory.code'], name='fk_risks_category'),
        sa.ForeignKeyConstraint(['probability_code'], ['tblProbabilityOccurrence.code'], name='fk_risks_probability'),
        sa.ForeignKeyConstraint(['severity_code'], ['tblSeverityOccurrence.code'], name='fk_risks_severity'),
    )
    op.create_index('ix_risks_id', 'tblRisks', ['id'])
    op.create_index('ix_risks_wbs_id', 'tblRisks', ['wbs_id'])


def downgrade() -> None:
    """Drop project, WBS, import, assignment, and risk tables."""
    # Drop in reverse dependency order
    op.drop_table('tblRisks')
    op.drop_table('tblResourceAssignment')
    op.drop_table('tblImportJobs')
    op.drop_table('tblWBS')
    op.drop_table('tblProjects')

    # Drop enum types
    op.execute('DROP TYPE importstatus')
    op.execute('DROP TYPE projectsourceformat')
    op.execute('DROP TYPE projectstatus')
