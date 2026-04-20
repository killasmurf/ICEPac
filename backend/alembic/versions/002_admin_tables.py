"""Phase 2: Admin circuit tables

Revision ID: 002_admin_tables
Revises: 001_help_system
Create Date: 2026-01-28
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = "002_admin_tables"
down_revision = "001_help_system"
branch_labels = None
depends_on = None


def upgrade():
    now = datetime.utcnow().isoformat()

    # ── Suppliers ──────────────────────────────────────────────
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), unique=True, nullable=False),
        sa.Column("contact_name", sa.String(200), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_suppliers_name", "suppliers", ["name"])

    # ── Resources ─────────────────────────────────────────────
    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("resource_code", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("eoc", sa.String(50), nullable=True),
        sa.Column("cost", sa.Float(), default=0.0, nullable=False),
        sa.Column("units", sa.String(50), nullable=True),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("supplier_name", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_resources_code", "resources", ["resource_code"])
    op.create_index("ix_resources_eoc", "resources", ["eoc"])

    # ── Standard Config Tables ────────────────────────────────
    for table_name in ["cost_types", "expense_types", "regions", "business_areas",
                       "estimating_techniques", "risk_categories", "expenditure_indicators"]:
        op.create_table(
            table_name,
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(200), unique=True, nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("code", sa.String(20), unique=True, nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
            sa.Column("sort_order", sa.Integer(), default=0, nullable=False),
            sa.Column("created_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
            sa.Column("updated_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        )

    # ── Weighted Config Tables ────────────────────────────────
    for table_name in ["probability_levels", "severity_levels"]:
        op.create_table(
            table_name,
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(200), unique=True, nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("weight", sa.Float(), default=0.0, nullable=False),
            sa.Column("level", sa.Integer(), default=1, nullable=False),
            sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
            sa.Column("sort_order", sa.Integer(), default=0, nullable=False),
            sa.Column("created_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
            sa.Column("updated_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        )

    op.create_table(
        "pmb_weights",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("weight", sa.Float(), default=0.0, nullable=False),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("sort_order", sa.Integer(), default=0, nullable=False),
        sa.Column("created_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
        sa.Column("updated_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
    )

    # ── Audit Logs ────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("old_values", sa.Text(), nullable=True),
        sa.Column("new_values", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=datetime.utcnow, nullable=False),
    )
    op.create_index("ix_audit_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_action", "audit_logs", ["action"])
    op.create_index("ix_audit_entity", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_created", "audit_logs", ["created_at"])

    # ── Seed Data ─────────────────────────────────────────────
    op.execute(f"""
        INSERT INTO cost_types (name, code, description, is_active, sort_order, created_at, updated_at) VALUES
        ('Labor', 'LBR', 'Direct labor costs', true, 1, '{now}', '{now}'),
        ('Materials', 'MAT', 'Materials and supplies', true, 2, '{now}', '{now}'),
        ('Subcontract', 'SUB', 'Subcontractor costs', true, 3, '{now}', '{now}'),
        ('Travel', 'TRV', 'Travel and transportation', true, 4, '{now}', '{now}'),
        ('Other Direct Costs', 'ODC', 'Other direct costs', true, 5, '{now}', '{now}'),
        ('Overhead', 'OH', 'Indirect/overhead costs', true, 6, '{now}', '{now}');
    """)

    op.execute(f"""
        INSERT INTO estimating_techniques (name, code, description, is_active, sort_order, created_at, updated_at) VALUES
        ('Analogy', 'ANA', 'Estimation by analogy to similar projects', true, 1, '{now}', '{now}'),
        ('Parametric', 'PAR', 'Statistical parametric models', true, 2, '{now}', '{now}'),
        ('Engineering Build-Up', 'ENG', 'Bottom-up engineering estimate', true, 3, '{now}', '{now}'),
        ('Expert Opinion', 'EXP', 'Subject matter expert judgment', true, 4, '{now}', '{now}'),
        ('Vendor Quote', 'VND', 'Vendor/supplier quotation', true, 5, '{now}', '{now}');
    """)

    op.execute(f"""
        INSERT INTO risk_categories (name, code, description, is_active, sort_order, created_at, updated_at) VALUES
        ('Technical', 'TECH', 'Technical complexity risks', true, 1, '{now}', '{now}'),
        ('Schedule', 'SCHED', 'Schedule and timeline risks', true, 2, '{now}', '{now}'),
        ('Cost', 'COST', 'Cost overrun risks', true, 3, '{now}', '{now}'),
        ('Programmatic', 'PROG', 'Program management risks', true, 4, '{now}', '{now}'),
        ('External', 'EXT', 'External/environmental risks', true, 5, '{now}', '{now}');
    """)

    op.execute(f"""
        INSERT INTO probability_levels (name, description, weight, level, is_active, sort_order, created_at, updated_at) VALUES
        ('Very Low', 'Less than 10% probability', 0.05, 1, true, 1, '{now}', '{now}'),
        ('Low', '10-25% probability', 0.175, 2, true, 2, '{now}', '{now}'),
        ('Medium', '25-50% probability', 0.375, 3, true, 3, '{now}', '{now}'),
        ('High', '50-75% probability', 0.625, 4, true, 4, '{now}', '{now}'),
        ('Very High', 'Greater than 75% probability', 0.875, 5, true, 5, '{now}', '{now}');
    """)

    op.execute(f"""
        INSERT INTO severity_levels (name, description, weight, level, is_active, sort_order, created_at, updated_at) VALUES
        ('Negligible', 'Minimal impact', 0.05, 1, true, 1, '{now}', '{now}'),
        ('Minor', 'Small impact, easily managed', 0.2, 2, true, 2, '{now}', '{now}'),
        ('Moderate', 'Noticeable impact, manageable', 0.4, 3, true, 3, '{now}', '{now}'),
        ('Significant', 'Major impact on project', 0.7, 4, true, 4, '{now}', '{now}'),
        ('Critical', 'Severe impact, project threatening', 0.95, 5, true, 5, '{now}', '{now}');
    """)


def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("pmb_weights")
    op.drop_table("severity_levels")
    op.drop_table("probability_levels")
    op.drop_table("expenditure_indicators")
    op.drop_table("risk_categories")
    op.drop_table("estimating_techniques")
    op.drop_table("business_areas")
    op.drop_table("regions")
    op.drop_table("expense_types")
    op.drop_table("cost_types")
    op.drop_table("resources")
    op.drop_table("suppliers")
