"""Add a default supplier to resources.

Revision ID: 008_resource_supplier
Revises: 007_merge_legacy_branch
Create Date: 2026-11-20 00:00:00.000000

Adds the nullable ``tblResource.supplier_code`` column with a foreign key to
``tblSupplier.supplier_code`` (the same link resource assignments use).
"""

import sqlalchemy as sa

from alembic import op

revision = "008_resource_supplier"
down_revision = "007_merge_legacy_branch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tblResource") as batch:
        batch.add_column(
            sa.Column("supplier_code", sa.String(length=50), nullable=True)
        )
        batch.create_foreign_key(
            "fk_resource_supplier_code",
            "tblSupplier",
            ["supplier_code"],
            ["supplier_code"],
        )


def downgrade() -> None:
    with op.batch_alter_table("tblResource") as batch:
        batch.drop_constraint("fk_resource_supplier_code", type_="foreignkey")
        batch.drop_column("supplier_code")
