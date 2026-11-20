"""Projects list: archived filter, restore, status filter, sorting, audit."""

from datetime import datetime, timedelta

import pytest

from app.models.database.audit_log import AuditLog
from app.models.database.project import Project, ProjectStatus
from app.models.database.user import UserRole
from tests.helpers import auth, make_user

BASE = "/api/v1/projects"


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def manager(db):
    return make_user(db, "mgr", UserRole.MANAGER)


def _add(db, name, manager=None, status=ProjectStatus.DRAFT, archived=False, age=0):
    stamp = datetime(2026, 1, 1) + timedelta(days=age)
    project = Project(
        project_name=name,
        project_manager=manager,
        status=status,
        archived=archived,
        created_at=stamp,
        updated_at=stamp,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def projects(db):
    return {
        "a": _add(db, "Alpha", "Zed", ProjectStatus.ACTIVE, age=1),
        "b": _add(db, "Bravo", "Amy", ProjectStatus.DRAFT, age=2),
        "c": _add(db, "Charlie", "Amy", ProjectStatus.ACTIVE, age=2),
        "d": _add(db, "Delta old", "Bob", ProjectStatus.ACTIVE, archived=True, age=3),
        "e": _add(db, "Echo old", None, ProjectStatus.DRAFT, archived=True, age=4),
    }


def _names(resp):
    assert resp.status_code == 200, resp.text
    return [p["project_name"] for p in resp.json()["items"]]


def _get(client, admin, **params):
    return client.get(BASE, params=params, headers=auth(admin))


def test_default_lists_active_only_and_is_deterministic(client, admin, projects):
    resp = _get(client, admin)
    # updated_at desc, id desc: Charlie (id 3) before Bravo (id 2) on a tie
    assert _names(resp) == ["Charlie", "Bravo", "Alpha"]
    assert resp.json()["total"] == 3
    assert _names(_get(client, admin, archived="false")) == [
        "Charlie",
        "Bravo",
        "Alpha",
    ]


def test_archived_true_lists_archived_only(client, admin, projects):
    resp = _get(client, admin, archived="true")
    assert _names(resp) == ["Echo old", "Delta old"]
    assert resp.json()["total"] == 2
    assert all(p["archived"] for p in resp.json()["items"])


def test_archived_combines_with_search_status_sort(client, admin, projects):
    assert _names(_get(client, admin, archived="true", search="delta")) == ["Delta old"]
    resp = _get(client, admin, archived="true", search="old", status="draft")
    assert _names(resp) == ["Echo old"]
    assert resp.json()["total"] == 1
    resp = _get(client, admin, archived="true", sort="name", order="desc")
    assert _names(resp) == ["Echo old", "Delta old"]
    # search does not leak across views
    assert _names(_get(client, admin, search="old")) == []
    assert _get(client, admin, search="old").json()["total"] == 0


def test_total_ignores_paging(client, admin, projects):
    resp = _get(client, admin, limit=1, skip=1, sort="name")
    assert _names(resp) == ["Bravo"]
    assert resp.json()["total"] == 3


@pytest.mark.parametrize(
    "sort,order,expected",
    [
        ("name", "asc", ["Alpha", "Bravo", "Charlie"]),
        ("name", "desc", ["Charlie", "Bravo", "Alpha"]),
        ("name", None, ["Alpha", "Bravo", "Charlie"]),
        # manager ties (Amy, Amy) broken by id in the same direction
        ("manager", "asc", ["Bravo", "Charlie", "Alpha"]),
        ("manager", "desc", ["Alpha", "Charlie", "Bravo"]),
        # status ties broken by id
        ("status", "asc", ["Alpha", "Charlie", "Bravo"]),
        ("status", "desc", ["Bravo", "Charlie", "Alpha"]),
        ("updated_at", "asc", ["Alpha", "Bravo", "Charlie"]),
        ("updated_at", "desc", ["Charlie", "Bravo", "Alpha"]),
        ("updated_at", None, ["Charlie", "Bravo", "Alpha"]),
        ("created_at", "asc", ["Alpha", "Bravo", "Charlie"]),
        ("created_at", "desc", ["Charlie", "Bravo", "Alpha"]),
        ("created_at", None, ["Charlie", "Bravo", "Alpha"]),
    ],
)
def test_sort_fields_both_directions_with_ties(
    client, admin, projects, sort, order, expected
):
    params = {"sort": sort}
    if order:
        params["order"] = order
    assert _names(_get(client, admin, **params)) == expected


def test_order_without_sort_applies_to_default_field(client, admin, projects):
    assert _names(_get(client, admin, order="asc")) == ["Alpha", "Bravo", "Charlie"]


def test_status_filter(client, admin, projects):
    resp = _get(client, admin, status="active", sort="name")
    assert _names(resp) == ["Alpha", "Charlie"]
    assert resp.json()["total"] == 2
    resp = _get(client, admin, status="draft")
    assert _names(resp) == ["Bravo"]
    assert _names(_get(client, admin, status="imported")) == []
    resp = _get(client, admin, status="active", search="char")
    assert _names(resp) == ["Charlie"]


@pytest.mark.parametrize(
    "params",
    [
        {"sort": "bogus"},
        {"sort": "project_name"},
        {"order": "sideways"},
        {"status": "nope"},
        {"status": "ACTIVE"},
    ],
)
def test_invalid_query_values_are_422(client, admin, projects, params):
    assert _get(client, admin, **params).status_code == 422


def test_restore_flow_and_audit(client, db, admin, projects):
    pid = projects["d"].id
    headers = {**auth(admin), "User-Agent": "pytest-restore/1.0"}
    resp = client.post(f"{BASE}/{pid}/restore", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["archived"] is False
    assert resp.json()["id"] == pid
    assert "Delta old" in _names(_get(client, admin))
    assert "Delta old" not in _names(_get(client, admin, archived="true"))

    db.expire_all()
    rows = db.query(AuditLog).filter(AuditLog.entity_type == "Project").all()
    assert len(rows) == 1
    row = rows[0]
    assert row.action == "UPDATE" and row.entity_id == pid
    assert row.user_id == admin.id
    assert row.old_values["archived"] is True
    assert row.new_values["archived"] is False
    assert row.user_agent == "pytest-restore/1.0"


def test_restore_404_and_409(client, admin, projects):
    assert client.post(f"{BASE}/9999/restore", headers=auth(admin)).status_code == 404
    pid = projects["a"].id
    resp = client.post(f"{BASE}/{pid}/restore", headers=auth(admin))
    assert resp.status_code == 409


def test_manager_may_restore(client, manager, projects):
    pid = projects["e"].id
    assert (
        client.post(f"{BASE}/{pid}/restore", headers=auth(manager)).status_code == 200
    )


@pytest.mark.parametrize("role", [UserRole.USER, UserRole.VIEWER])
def test_other_roles_cannot_restore_or_archive(client, db, projects, role):
    user = make_user(db, f"u_{role.value}", role)
    archived = projects["d"].id
    active = projects["a"].id
    assert (
        client.post(f"{BASE}/{archived}/restore", headers=auth(user)).status_code == 403
    )
    assert client.delete(f"{BASE}/{active}", headers=auth(user)).status_code == 403
    assert client.post(f"{BASE}/{archived}/restore").status_code == 401


def test_archive_writes_audit_and_archived_project_still_readable(
    client, db, admin, projects
):
    pid = projects["a"].id
    assert client.delete(f"{BASE}/{pid}", headers=auth(admin)).status_code == 204
    db.expire_all()
    rows = db.query(AuditLog).filter(AuditLog.entity_type == "Project").all()
    assert len(rows) == 1
    assert rows[0].old_values["archived"] is False
    assert rows[0].new_values["archived"] is True
    assert rows[0].entity_id == pid and rows[0].user_id == admin.id

    detail = client.get(f"{BASE}/{pid}", headers=auth(admin))
    assert detail.status_code == 200
    assert detail.json()["archived"] is True
    assert "Alpha" in _names(_get(client, admin, archived="true"))


def test_restore_unknown_project_writes_no_audit(client, db, admin):
    client.post(f"{BASE}/42/restore", headers=auth(admin))
    assert db.query(AuditLog).filter(AuditLog.entity_type == "Project").count() == 0
