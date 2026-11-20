"""Merge the legacy 002_remaining_tables branch into the main history.

Revision ID: 007_merge_legacy_branch
Revises: 006_project_level_risks, 002_remaining_tables
Create Date: 2026-11-20 00:00:00.000000

``002_remaining_tables`` is now an empty revision (see its docstring), so this
merge does not change the schema. It exists only to leave the repository with a
single head.
"""

from typing import Sequence, Union

revision: str = "007_merge_legacy_branch"
down_revision: Union[str, Sequence[str], None] = (
    "006_project_level_risks",
    "002_remaining_tables",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No schema change."""


def downgrade() -> None:
    """No schema change."""
