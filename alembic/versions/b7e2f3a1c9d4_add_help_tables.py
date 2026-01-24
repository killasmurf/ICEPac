"""Add help tables

Revision ID: b7e2f3a1c9d4
Revises: a41d9a15aea8
Create Date: 2026-01-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2f3a1c9d4'
down_revision: Union[str, None] = 'a41d9a15aea8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create help_categories table
    op.create_table(
        'help_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_help_categories_id'), 'help_categories', ['id'], unique=False)

    # Create help_topics table
    op.create_table(
        'help_topics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['category_id'], ['help_categories.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_help_topics_id'), 'help_topics', ['id'], unique=False)

    # Create help_descriptions table
    op.create_table(
        'help_descriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('section_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('detailed_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['topic_id'], ['help_topics.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_help_descriptions_id'), 'help_descriptions', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_help_descriptions_id'), table_name='help_descriptions')
    op.drop_table('help_descriptions')
    op.drop_index(op.f('ix_help_topics_id'), table_name='help_topics')
    op.drop_table('help_topics')
    op.drop_index(op.f('ix_help_categories_id'), table_name='help_categories')
    op.drop_table('help_categories')
