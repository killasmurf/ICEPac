"""F-11: assignment, risk and login events write audit rows."""

import json

import pytest

from app.models.database.audit_log import AuditLog
from app.models.database.user import UserRole
from tests.helpers import PASSWORD, auth, make_user, seed_project

BASE = "/api/v1/projects"
UA = {"User-Agent": "pytest-audit/1.0"}


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def seeded(db):
    return seed_project(db)


def _rows(db, entity_type=None, action=None):
    db.expire_all()
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)
    return q.order_by(AuditLog.id).all()


def _assert_origin(row, user):
    assert row.user_id == user.id
    assert row.ip_address
    assert row.user_agent == "pytest-audit/1.0"


ASSIGN = {
    "resource_code": "ENG",
    "cost_type_code": "LAB",
    "best_estimate": "10.00",
    "likely_estimate": "20.00",
    "worst_estimate": "40.00",
}


def test_assignment_create_update_delete_are_audited(client, db, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_b"].id
    h = {**auth(admin), **UA}
    url = f"{BASE}/{pid}/wbs/{wid}/assignments"
    created = client.post(url, json=ASSIGN, headers=h)
    assert created.status_code == 201, created.text
    aid = created.json()["id"]

    rows = _rows(db, "ResourceAssignment")
    assert [r.action for r in rows] == ["CREATE"]
    assert rows[0].entity_id == aid
    assert rows[0].new_values["resource_code"] == "ENG"
    _assert_origin(rows[0], admin)

    resp = client.put(f"{url}/{aid}", json={"likely_estimate": "25.00"}, headers=h)
    assert resp.status_code == 200, resp.text
    rows = _rows(db, "ResourceAssignment", "UPDATE")
    assert len(rows) == 1
    assert rows[0].old_values["likely_estimate"] == 20.0
    assert rows[0].new_values["likely_estimate"] == 25.0
    _assert_origin(rows[0], admin)

    assert client.delete(f"{url}/{aid}", headers=h).status_code == 204
    rows = _rows(db, "ResourceAssignment", "DELETE")
    assert len(rows) == 1 and rows[0].entity_id == aid
    assert rows[0].old_values["resource_code"] == "ENG"
    _assert_origin(rows[0], admin)


def test_failed_assignment_writes_no_audit_row(client, db, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_b"].id
    resp = client.post(
        f"{BASE}/{pid}/wbs/{wid}/assignments",
        json={**ASSIGN, "resource_code": "NOPE"},
        headers=auth(admin),
    )
    assert resp.status_code >= 400
    assert _rows(db, "ResourceAssignment") == []


RISK = {"title": "audited", "risk_cost": "100.00", "risk_category_code": "TECH"}


def test_wbs_risk_create_update_delete_are_audited(client, db, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_b"].id
    h = {**auth(admin), **UA}
    url = f"{BASE}/{pid}/wbs/{wid}/risks"
    rid = client.post(url, json=RISK, headers=h).json()["id"]
    assert client.put(f"{url}/{rid}", json={"title": "renamed"}, headers=h).is_success
    assert client.delete(f"{url}/{rid}", headers=h).status_code == 204

    rows = _rows(db, "Risk")
    assert [r.action for r in rows] == ["CREATE", "UPDATE", "DELETE"]
    assert all(r.entity_id == rid for r in rows)
    assert rows[0].new_values["title"] == "audited"
    assert rows[1].old_values["title"] == "audited"
    assert rows[1].new_values["title"] == "renamed"
    assert rows[2].old_values["title"] == "renamed"
    for r in rows:
        _assert_origin(r, admin)


def test_project_risk_create_update_delete_are_audited(client, db, admin, seeded):
    pid = seeded["project"].id
    h = {**auth(admin), **UA}
    url = f"{BASE}/{pid}/risks"
    rid = client.post(url, json=RISK, headers=h).json()["id"]
    assert client.put(f"{url}/{rid}", json={"status": "closed"}, headers=h).is_success
    assert client.delete(f"{url}/{rid}", headers=h).status_code == 204

    rows = _rows(db, "Risk")
    assert [r.action for r in rows] == ["CREATE", "UPDATE", "DELETE"]
    assert rows[0].new_values["project_id"] == pid
    assert rows[1].new_values["status"] == "closed"
    for r in rows:
        _assert_origin(r, admin)


def test_successful_login_is_audited(client, db, admin):
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "boss", "password": PASSWORD},
        headers=UA,
    )
    assert resp.status_code == 200
    rows = _rows(db, action="LOGIN")
    assert len(rows) == 1
    assert rows[0].user_id == admin.id and rows[0].entity_id == admin.id
    _assert_origin(rows[0], admin)


def test_failed_login_is_audited_without_the_password(client, db, admin):
    secret = "Sup3r-Secret-Guess!"
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "boss", "password": secret},
        headers=UA,
    )
    assert resp.status_code == 401
    resp = client.post(
        "/api/v1/auth/login", data={"username": "ghost", "password": secret}
    )
    assert resp.status_code == 401

    rows = _rows(db, action="FAILED_LOGIN")
    assert [r.new_values for r in rows] == [{"username": "boss"}, {"username": "ghost"}]
    assert rows[0].user_agent == "pytest-audit/1.0" and rows[0].ip_address
    everything = json.dumps(
        [
            [r.action, r.entity_type, r.old_values, r.new_values, r.user_agent]
            for r in _rows(db)
        ]
    )
    assert secret not in everything and PASSWORD not in everything
    assert _rows(db, action="LOGIN") == []


def test_audit_failure_does_not_break_login(client, db, admin, monkeypatch):
    from app.services.audit_service import AuditService

    def boom(*a, **k):
        raise RuntimeError("audit store down")

    monkeypatch.setattr(AuditService, "log_login", boom)
    resp = client.post(
        "/api/v1/auth/login", data={"username": "boss", "password": PASSWORD}
    )
    assert resp.status_code == 200
