"""Tests for the Alembic migration history.

``test_single_head`` runs everywhere. The remaining tests need a real PostgreSQL
database (the schema uses PostgreSQL enum types, which SQLite cannot model) and
are skipped unless ``MIGRATIONS_TEST_DATABASE_URL`` is set, e.g.::

    MIGRATIONS_TEST_DATABASE_URL=postgresql://user:pw@127.0.0.1:5432/icepac_mig \
        python -m pytest tests/test_migrations.py

WARNING: the database named by that URL is wiped (``DROP SCHEMA public
CASCADE``) before every test. Point it at a throwaway database.
"""

import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

import app.models.database as models
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from app.core.database import Base

ROOT = Path(__file__).resolve().parents[1]
RAW_URL = os.environ.get("MIGRATIONS_TEST_DATABASE_URL")

requires_postgres = pytest.mark.skipif(
    not RAW_URL, reason="MIGRATIONS_TEST_DATABASE_URL is not set"
)


def _alembic_config(url: str = "") -> Config:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    if url:
        # '%' must be doubled because Config values go through ConfigParser.
        cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    return cfg


def test_single_head():
    """The history must be linear enough to have exactly one head."""
    script = ScriptDirectory.from_config(_alembic_config())
    assert script.get_heads() == ["007_merge_legacy_branch"]
    # Every revision must be an ancestor of that head.
    reachable = {rev.revision for rev in script.walk_revisions()}
    on_disk = {
        p.name for p in (ROOT / "alembic" / "versions").glob("*.py")
    }  # one file per revision
    assert len(reachable) == len(on_disk)


@pytest.fixture
def pg_url():
    """A PostgreSQL URL for an emptied database (psycopg2 driver)."""
    url = RAW_URL
    if url.startswith("postgresql://"):
        # SQLAlchemy 2.1 would pick psycopg (v3) for the bare scheme; the
        # project's driver is psycopg2.
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    _wipe(url)
    yield url
    _wipe(url)


def _wipe(url: str) -> None:
    engine = create_engine(url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    engine.dispose()


def _diffs(url: str):
    engine = create_engine(url)
    try:
        with engine.connect() as conn:
            ctx = MigrationContext.configure(conn, opts={"compare_type": True})
            return compare_metadata(ctx, Base.metadata)
    finally:
        engine.dispose()


def _scalar(url: str, sql: str):
    engine = create_engine(url)
    try:
        with engine.connect() as conn:
            return conn.execute(text(sql)).scalar()
    finally:
        engine.dispose()


@requires_postgres
def test_upgrade_matches_models_and_round_trips(pg_url):
    cfg = _alembic_config(pg_url)

    command.upgrade(cfg, "head")
    assert _scalar(pg_url, "SELECT version_num FROM alembic_version") == (
        "007_merge_legacy_branch"
    )
    assert _diffs(pg_url) == []

    # Every model table exists.
    engine = create_engine(pg_url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    assert set(Base.metadata.tables) <= tables

    # Reference/seed data is present and valid against the final schema.
    assert _scalar(pg_url, 'SELECT count(*) FROM "tblCostType"') == 7
    assert _scalar(pg_url, 'SELECT count(*) FROM "tblPMBWeight"') == 4
    assert _scalar(pg_url, 'SELECT count(*) FROM "tblResource"') == 10
    assert _scalar(pg_url, 'SELECT count(*) FROM "tblSupplier"') == 5

    command.downgrade(cfg, "base")
    engine = create_engine(pg_url)
    try:
        assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
    finally:
        engine.dispose()
    assert _scalar(pg_url, "SELECT count(*) FROM pg_type WHERE typtype = 'e'") == 0

    command.upgrade(cfg, "head")
    assert _diffs(pg_url) == []


@requires_postgres
def test_enum_columns_round_trip_through_orm(pg_url):
    command.upgrade(_alembic_config(pg_url), "head")
    engine = create_engine(pg_url)
    try:
        with Session(engine) as session:
            user = models.User(
                email="enum@example.com",
                username="enum",
                hashed_password="x",
                role=models.UserRole.MANAGER,
            )
            session.add(user)
            session.flush()
            for status in models.ProjectStatus:
                session.add(models.Project(project_name=status.value, status=status))
            for fmt in models.ProjectSourceFormat:
                session.add(
                    models.Project(project_name=f"fmt-{fmt.value}", source_format=fmt)
                )
            session.flush()
            project = session.query(models.Project).first()
            for status in models.ImportStatus:
                session.add(
                    models.ImportJob(
                        project_id=project.id,
                        user_id=user.id,
                        filename="plan.mpp",
                        status=status,
                    )
                )
            session.commit()
            session.expire_all()

            assert {p.status for p in session.query(models.Project)} == set(
                models.ProjectStatus
            )
            assert {
                p.source_format
                for p in session.query(models.Project)
                if p.source_format is not None
            } == set(models.ProjectSourceFormat)
            assert {j.status for j in session.query(models.ImportJob)} == set(
                models.ImportStatus
            )
            assert session.get(models.User, user.id).role is models.UserRole.MANAGER

            # The database stores the lowercase values, not the member names.
            stored = session.execute(
                text('SELECT DISTINCT status::text FROM "tblProjects"')
            ).scalars()
            assert set(stored) == {s.value for s in models.ProjectStatus}
    finally:
        engine.dispose()


@requires_postgres
def test_database_at_old_mainline_head_upgrades(pg_url):
    """A local database left at 006_project_level_risks upgrades cleanly."""
    cfg = _alembic_config(pg_url)
    command.upgrade(cfg, "006_project_level_risks")
    command.upgrade(cfg, "head")
    assert _scalar(pg_url, "SELECT version_num FROM alembic_version") == (
        "007_merge_legacy_branch"
    )
    assert _diffs(pg_url) == []


@requires_postgres
def test_database_from_legacy_002_remaining_branch_is_refused(pg_url):
    """A DB built by the old 002_remaining_tables fails loudly, not silently."""
    cfg = _alembic_config(pg_url)
    command.upgrade(cfg, "a41d9a15aea8")
    # Stand-in for the legacy branch's tables, then record its revision.
    engine = create_engine(pg_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        conn.execute(text('CREATE TABLE "tblProjects" (id integer primary key)'))
    engine.dispose()
    command.stamp(cfg, "002_remaining_tables", purge=True)

    with pytest.raises(RuntimeError, match="legacy"):
        command.upgrade(cfg, "head")
