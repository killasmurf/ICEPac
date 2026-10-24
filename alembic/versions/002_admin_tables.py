"""Phase 2: Admin Circuit Tables

Revision ID: 002_admin_tables
Revises: 001_help_system
Create Date: 2026-01-26

This migration creates the admin system tables:
- resources: Resource library (maps to tblResource)
- suppliers: Supplier management (maps to tblSupplier)
- Configuration tables: cost_types, expense_types, regions, etc.
- audit_logs: System audit trail
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic
revision = '002_admin_tables'
down_revision = 'b7e2f3a1c9d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create admin system tables."""
    
    # ================================================================
    # Resources Table
    # ================================================================
    op.create_table(
        'tblResource',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_code', sa.String(50), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('eoc', sa.String(50), nullable=True),
        sa.Column('cost', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('units', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('resource_code', name='uq_resources_code')
    )
    op.create_index('ix_resources_id', 'tblResource', ['id'])
    op.create_index('ix_resources_code', 'tblResource', ['resource_code'])
    op.create_index('ix_resources_is_active', 'tblResource', ['is_active'])

    # ================================================================
    # Suppliers Table
    # ================================================================
    op.create_table(
        'tblSupplier',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('supplier_code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('contact', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('supplier_code', name='uq_suppliers_code')
    )
    op.create_index('ix_suppliers_id', 'tblSupplier', ['id'])
    op.create_index('ix_suppliers_code', 'tblSupplier', ['supplier_code'])
    op.create_index('ix_suppliers_is_active', 'tblSupplier', ['is_active'])

    # ================================================================
    # Standard Configuration Tables
    # ================================================================
    config_tables = [
        'tblCostType',
        'tblExpType',
        'tblRegion',
        'tblBus_Area',
        'tblEstimatingTechnique',
        'tblRiskCategory',
        'tblExpInd',
    ]
    
    for table_name in config_tables:
        op.create_table(
            table_name,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(50), nullable=False),
            sa.Column('description', sa.String(255), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('code', name=f'uq_{table_name}_code')
        )
        op.create_index(f'ix_{table_name}_id', table_name, ['id'])
        op.create_index(f'ix_{table_name}_code', table_name, ['code'])

    # ================================================================
    # Weighted Configuration Tables
    # ================================================================
    weighted_tables = [
        'tblProbabilityOccurrence',
        'tblSeverityOccurrence',
        'tblPMBWeight',
    ]
    
    for table_name in weighted_tables:
        op.create_table(
            table_name,
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(50), nullable=False),
            sa.Column('description', sa.String(255), nullable=False),
            sa.Column('weight', sa.Numeric(5, 2), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('code', name=f'uq_{table_name}_code')
        )
        op.create_index(f'ix_{table_name}_id', table_name, ['id'])
        op.create_index(f'ix_{table_name}_code', table_name, ['code'])

    # ================================================================
    # Audit Logs Table
    # ================================================================
    op.create_table(
        'tblLog',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('old_values', JSONB(), nullable=True),
        sa.Column('new_values', JSONB(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['tblUsers.id'], name='fk_audit_logs_user_id', ondelete='SET NULL')
    )
    op.create_index('ix_audit_logs_id', 'tblLog', ['id'])
    op.create_index('ix_audit_logs_user_id', 'tblLog', ['user_id'])
    op.create_index('ix_audit_logs_action', 'tblLog', ['action'])
    op.create_index('ix_audit_logs_entity', 'tblLog', ['entity_type', 'entity_id'])
    op.create_index('ix_audit_logs_created_at', 'tblLog', ['created_at'])

    # ================================================================
    # Seed Data: Configuration Tables
    # ================================================================
    
    # Cost Types
    op.execute("""
        INSERT INTO tblCostType (code, description, is_active) VALUES
        ('LABOR', 'Labor costs', true),
        ('MATERIAL', 'Material costs', true),
        ('EQUIPMENT', 'Equipment costs', true),
        ('SUBCONTRACT', 'Subcontractor costs', true),
        ('TRAVEL', 'Travel and expenses', true),
        ('ODC', 'Other Direct Costs', true),
        ('OVERHEAD', 'Overhead costs', true)
    """)

    # Expense Types
    op.execute("""
        INSERT INTO tblExpType (code, description, is_active) VALUES
        ('CAPEX', 'Capital Expenditure', true),
        ('OPEX', 'Operating Expenditure', true),
        ('DIRECT', 'Direct Expense', true),
        ('INDIRECT', 'Indirect Expense', true)
    """)

    # Regions
    op.execute("""
        INSERT INTO tblRegion (code, description, is_active) VALUES
        ('NA', 'North America', true),
        ('EU', 'Europe', true),
        ('APAC', 'Asia Pacific', true),
        ('LATAM', 'Latin America', true),
        ('MEA', 'Middle East & Africa', true),
        ('GLOBAL', 'Global', true)
    """)

    # Business Areas
    op.execute("""
        INSERT INTO tblBus_Area (code, description, is_active) VALUES
        ('IT', 'Information Technology', true),
        ('ENG', 'Engineering', true),
        ('MFG', 'Manufacturing', true),
        ('RD', 'Research & Development', true),
        ('OPS', 'Operations', true),
        ('ADMIN', 'Administration', true),
        ('SALES', 'Sales & Marketing', true)
    """)

    # Estimating Techniques
    op.execute("""
        INSERT INTO tblEstimatingTechnique (code, description, is_active) VALUES
        ('ANALOG', 'Analogous Estimation', true),
        ('PARAM', 'Parametric Estimation', true),
        ('BOTTOMUP', 'Bottom-Up Estimation', true),
        ('TOPDOWN', 'Top-Down Estimation', true),
        ('EXPERT', 'Expert Judgment', true),
        ('VENDOR', 'Vendor Quote', true),
        ('HISTORICAL', 'Historical Data', true)
    """)

    # Risk Categories
    op.execute("""
        INSERT INTO tblRiskCategory (code, description, is_active) VALUES
        ('TECH', 'Technical Risk', true),
        ('SCHEDULE', 'Schedule Risk', true),
        ('COST', 'Cost Risk', true),
        ('RESOURCE', 'Resource Risk', true),
        ('EXTERNAL', 'External Risk', true),
        ('QUALITY', 'Quality Risk', true),
        ('SCOPE', 'Scope Risk', true)
    """)

    # Expenditure Indicators
    op.execute("""
        INSERT INTO tblExpInd (code, description, is_active) VALUES
        ('PLANNED', 'Planned Expenditure', true),
        ('ACTUAL', 'Actual Expenditure', true),
        ('COMMITTED', 'Committed Expenditure', true),
        ('FORECAST', 'Forecast Expenditure', true)
    """)

    # Probability Levels
    op.execute("""
        INSERT INTO tblProbabilityOccurrence (code, description, weight, is_active) VALUES
        ('RARE', 'Rare (1-10%)', 0.05, true),
        ('UNLIKELY', 'Unlikely (11-30%)', 0.20, true),
        ('POSSIBLE', 'Possible (31-50%)', 0.40, true),
        ('LIKELY', 'Likely (51-70%)', 0.60, true),
        ('ALMOST_CERTAIN', 'Almost Certain (71-99%)', 0.85, true)
    """)

    # Severity Levels
    op.execute("""
        INSERT INTO tblSeverityOccurrence (code, description, weight, is_active) VALUES
        ('NEGLIGIBLE', 'Negligible Impact', 0.05, true),
        ('MINOR', 'Minor Impact', 0.10, true),
        ('MODERATE', 'Moderate Impact', 0.25, true),
        ('MAJOR', 'Major Impact', 0.50, true),
        ('CRITICAL', 'Critical Impact', 0.90, true)
    """)

    # PMB Weights
    op.execute("""
        INSERT INTO tblPMBWeight (code, description, weight, is_active) VALUES
        ('LOW', 'Low Confidence', 0.25, true),
        ('MEDIUM', 'Medium Confidence', 0.50, true),
        ('HIGH', 'High Confidence', 0.75, true),
        ('VERY_HIGH', 'Very High Confidence', 0.90, true)
    """)

    # ================================================================
    # Seed Data: Sample Resources
    # ================================================================
    op.execute("""
        INSERT INTO tblResource (resource_code, description, eoc, cost, units, is_active) VALUES
        ('ENG-SR', 'Senior Engineer', 'LABOR', 150.00, 'hour', true),
        ('ENG-JR', 'Junior Engineer', 'LABOR', 85.00, 'hour', true),
        ('PM', 'Project Manager', 'LABOR', 175.00, 'hour', true),
        ('BA', 'Business Analyst', 'LABOR', 125.00, 'hour', true),
        ('QA', 'QA Engineer', 'LABOR', 95.00, 'hour', true),
        ('DEV-SR', 'Senior Developer', 'LABOR', 160.00, 'hour', true),
        ('DEV-JR', 'Junior Developer', 'LABOR', 90.00, 'hour', true),
        ('ARCH', 'Solution Architect', 'LABOR', 200.00, 'hour', true),
        ('ADMIN', 'System Administrator', 'LABOR', 110.00, 'hour', true),
        ('SUPPORT', 'Support Specialist', 'LABOR', 75.00, 'hour', true)
    """)

    # ================================================================
    # Seed Data: Sample Suppliers
    # ================================================================
    op.execute("""
        INSERT INTO tblSupplier (supplier_code, name, contact, phone, email, is_active) VALUES
        ('ACME', 'Acme Corporation', 'John Smith', '+1-555-0100', 'john@acme.com', true),
        ('TECHSOL', 'Tech Solutions Inc', 'Jane Doe', '+1-555-0200', 'jane@techsol.com', true),
        ('GLOBSERV', 'Global Services Ltd', 'Bob Wilson', '+1-555-0300', 'bob@globserv.com', true),
        ('PROCURE', 'Procurement Partners', 'Alice Brown', '+1-555-0400', 'alice@procure.com', true),
        ('CONSULT', 'Consulting Group', 'Mike Davis', '+1-555-0500', 'mike@consult.com', true)
    """)


def downgrade() -> None:
    """Drop admin system tables."""
    # Drop audit logs first (has FK)
    op.drop_table('tblLog')
    
    # Drop weighted config tables
    op.drop_table('tblPMBWeight')
    op.drop_table('tblSeverityOccurrence')
    op.drop_table('tblProbabilityOccurrence')
    
    # Drop standard config tables
    op.drop_table('tblExpInd')
    op.drop_table('tblRiskCategory')
    op.drop_table('tblEstimatingTechnique')
    op.drop_table('tblBus_Area')
    op.drop_table('tblRegion')
    op.drop_table('tblExpType')
    op.drop_table('tblCostType')
    
    # Drop resources and suppliers
    op.drop_table('tblSupplier')
    op.drop_table('tblResource')
