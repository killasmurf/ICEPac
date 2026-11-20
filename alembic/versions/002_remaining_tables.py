"""Superseded duplicate of the 002_admin_tables -> 006 chain (now a no-op).

Revision ID: 002_remaining_tables
Revises: a41d9a15aea8
Create Date: 2026-02-20 00:00:00.000000

History: this revision originally created ~17 tables (lookups, resources,
suppliers, projects, WBS, assignments, risks, audit log) that the
002_admin_tables -> 003_project_import -> ... -> 006_project_level_risks
branch also creates, with older/different column definitions. Having both
branches made ``alembic upgrade head`` ambiguous (two heads) and merging them
would have failed with "relation already exists".

The mainline chain (002_admin_tables ... 006_project_level_risks) is the
authoritative schema. This revision is kept, with the same ID and file name,
so that the revision graph and any ``alembic_version`` rows that mention it
stay resolvable, but it no longer creates anything. It is joined back into the
single history by ``007_merge_legacy_branch``.

A database that was actually built by the *old* version of this migration has
the old table definitions and cannot be upgraded in place; see
docs/MIGRATIONS.md (drop and recreate; ``002_admin_tables`` aborts with a
clear message if it detects such a database).
"""

from typing import Sequence, Union

revision: str = "002_remaining_tables"
down_revision: Union[str, None] = "a41d9a15aea8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Intentionally empty: see module docstring."""


def downgrade() -> None:
    """Intentionally empty: see module docstring."""
