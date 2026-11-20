"""Migration 008: tblResource.supplier_code (nullable FK to tblSupplier)."""

from sqlalchemy import create_engine, inspect, text

from alembic import command
from tests.test_migrations import (  # noqa: F401  (pg_url is a fixture)
    _alembic_config,
    _diffs,
    pg_url,
    requires_postgres,
)


def _column(url):
    engine = create_engine(url)
    try:
        insp = inspect(engine)
        cols = {c["name"]: c for c in insp.get_columns("tblResource")}
        fks = insp.get_foreign_keys("tblResource")
        return cols.get("supplier_code"), fks
    finally:
        engine.dispose()


@requires_postgres
def test_008_adds_nullable_fk_column_and_keeps_existing_rows(pg_url):  # noqa: F811
    cfg = _alembic_config(pg_url)
    command.upgrade(cfg, "007_merge_legacy_branch")
    col, fks = _column(pg_url)
    assert col is None and fks == []

    engine = create_engine(pg_url)
    with engine.begin() as conn:
        before = conn.execute(text('SELECT count(*) FROM "tblResource"')).scalar()
    engine.dispose()
    assert before == 10

    command.upgrade(cfg, "head")
    col, fks = _column(pg_url)
    assert col is not None and col["nullable"] is True
    assert [
        (fk["constrained_columns"], fk["referred_table"], fk["referred_columns"])
        for fk in fks
    ] == [(["supplier_code"], "tblSupplier", ["supplier_code"])]
    engine = create_engine(pg_url)
    with engine.begin() as conn:
        assert conn.execute(text('SELECT count(*) FROM "tblResource"')).scalar() == 10
        assert (
            conn.execute(
                text('SELECT count(*) FROM "tblResource" WHERE supplier_code IS NULL')
            ).scalar()
            == 10
        )
        # The FK rejects an unknown supplier.
        try:
            conn.execute(
                text("UPDATE \"tblResource\" SET supplier_code = 'NOPE' WHERE id = 1")
            )
            rejected = False
        except Exception:
            rejected = True
    engine.dispose()
    assert rejected
    assert _diffs(pg_url) == []


@requires_postgres
def test_008_downgrade_removes_column_and_fk(pg_url):  # noqa: F811
    cfg = _alembic_config(pg_url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "007_merge_legacy_branch")
    col, fks = _column(pg_url)
    assert col is None and fks == []
    command.upgrade(cfg, "head")
    assert _diffs(pg_url) == []
