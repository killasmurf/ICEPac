"""F-07 (reference reads for everyone), F-13 (managers cannot create admins),
F-06 (weight on weighted config tables)."""

import re

import pytest

from app.main import app
from app.models.database.user import UserRole
from tests.helpers import auth, iter_api_routes, make_user, seed_config

ADMIN_PREFIX = "/api/v1/admin"
API = ADMIN_PREFIX


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def manager(db):
    return make_user(db, "mgr", UserRole.MANAGER)


@pytest.fixture
def plain(db):
    return make_user(db, "plain", UserRole.USER)


@pytest.fixture
def viewer(db):
    return make_user(db, "viewer", UserRole.VIEWER)


def _admin_routes():
    return [
        r
        for r in iter_api_routes(app.routes)
        if r.path.startswith(ADMIN_PREFIX) and r.methods
    ]


def _concrete(path: str) -> str:
    path = path.replace("{table_name}", "cost-types")
    return re.sub(r"\{[^}]+\}", "1", path)


# ---- guard against a write route silently losing its role check -------------


def test_admin_routes_are_discovered():
    assert len(_admin_routes()) >= 20


@pytest.mark.parametrize("role", [UserRole.USER, UserRole.VIEWER])
def test_every_non_get_admin_route_rejects_non_staff(client, db, role):
    user = make_user(db, "lowly", role)
    checked = []
    for route in _admin_routes():
        for method in sorted(route.methods - {"GET", "HEAD", "OPTIONS"}):
            url = _concrete(route.path)
            resp = client.request(method, url, json={}, headers=auth(user))
            assert (
                resp.status_code == 403
            ), f"{method} {route.path} -> {resp.status_code}"
            checked.append((method, route.path))
    assert len(checked) >= 12


READ_OPEN = {
    "/api/v1/admin/resources",
    "/api/v1/admin/resources/{resource_id}",
    "/api/v1/admin/suppliers",
    "/api/v1/admin/suppliers/{supplier_id}",
    "/api/v1/admin/config",
    "/api/v1/admin/config/{table_name}",
    "/api/v1/admin/config/{table_name}/{item_id}",
}


def test_get_routes_closed_to_plain_user_except_reference_reads(client, plain):
    for route in _admin_routes():
        if "GET" not in route.methods:
            continue
        resp = client.get(_concrete(route.path), headers=auth(plain))
        if route.path in READ_OPEN:
            assert resp.status_code != 403, route.path
        else:
            assert resp.status_code == 403, f"GET {route.path} -> {resp.status_code}"


def test_unauthenticated_requests_are_401(client):
    for route in _admin_routes():
        for method in route.methods - {"HEAD", "OPTIONS"}:
            resp = client.request(method, _concrete(route.path), json={})
            assert resp.status_code == 401, f"{method} {route.path}"


# ---- F-07: reference data readable by every signed-in role -------------------


@pytest.mark.parametrize("who", ["admin", "manager", "plain", "viewer"])
def test_reference_reads_open_to_every_role(
    client, db, who, admin, manager, plain, viewer
):
    seed_config(db)
    user = {"admin": admin, "manager": manager, "plain": plain, "viewer": viewer}[who]
    h = auth(user)
    assert (
        client.get(f"{API}/resources?limit=1000&active_only=true", headers=h).json()[
            "total"
        ]
        == 2
    )
    assert client.get(f"{API}/resources/1", headers=h).status_code == 200
    assert client.get(f"{API}/suppliers", headers=h).json()["total"] == 1
    assert client.get(f"{API}/suppliers/1", headers=h).status_code == 200
    tables = client.get(f"{API}/config", headers=h).json()["tables"]
    assert len(tables) == 10
    for t in tables:
        resp = client.get(f"{API}/config/{t['key']}", headers=h)
        assert resp.status_code == 200, t["key"]
    assert client.get(f"{API}/config/cost-types/1", headers=h).status_code == 200


def test_reference_writes_still_staff_only(client, db, admin, manager, plain):
    seed_config(db)
    assert (
        client.post(
            f"{API}/config/cost-types",
            json={"code": "NEWC", "description": "New"},
            headers=auth(plain),
        ).status_code
        == 403
    )
    for who in (admin, manager):
        resp = client.post(
            f"{API}/config/cost-types",
            json={"code": f"C{who.id}", "description": "New"},
            headers=auth(who),
        )
        assert resp.status_code == 201, resp.text


def test_users_and_audit_logs_unchanged(client, admin, manager, plain):
    assert client.get(f"{API}/users", headers=auth(plain)).status_code == 403
    assert client.get(f"{API}/users", headers=auth(manager)).status_code == 200
    assert client.get(f"{API}/audit-logs", headers=auth(manager)).status_code == 403
    assert client.get(f"{API}/audit-logs", headers=auth(admin)).status_code == 200


# ---- F-06: weight on weighted config tables ---------------------------------


@pytest.mark.parametrize(
    "table", ["probability-levels", "severity-levels", "pmb-weights"]
)
def test_weighted_tables_return_numeric_weight(client, admin, table):
    h = auth(admin)
    created = client.post(
        f"{API}/config/{table}",
        json={"code": "ONE", "description": "One", "weight": 0.75},
        headers=h,
    )
    assert created.status_code == 201, created.text
    assert created.json()["weight"] == 0.75
    listed = client.get(f"{API}/config/{table}", headers=h).json()
    assert listed["total"] == 1
    assert listed["items"][0]["weight"] == 0.75
    assert isinstance(listed["items"][0]["weight"], float)
    one = client.get(f"{API}/config/{table}/{listed['items'][0]['id']}", headers=h)
    assert one.json()["weight"] == 0.75
    active = client.get(f"{API}/config/{table}?active_only=true", headers=h).json()
    assert active["items"][0]["weight"] == 0.75


def test_unweighted_tables_have_no_weight(client, db, admin):
    seed_config(db)
    items = client.get(f"{API}/config/cost-types", headers=auth(admin)).json()["items"]
    assert items and "weight" not in items[0]


# ---- F-13: managers cannot create admins or touch admin accounts ------------

NEW_USER = {
    "email": "new@example.com",
    "username": "newbie",
    "password": "longenough1",
    "role": "user",
}


def test_manager_cannot_create_admin(client, manager):
    resp = client.post(
        f"{API}/users", json={**NEW_USER, "role": "admin"}, headers=auth(manager)
    )
    assert resp.status_code == 403
    assert "admin" in resp.json()["detail"].lower()


@pytest.mark.parametrize("role", ["user", "manager", "viewer"])
def test_manager_can_create_non_admin(client, manager, role):
    resp = client.post(
        f"{API}/users", json={**NEW_USER, "role": role}, headers=auth(manager)
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == role


def test_admin_can_create_admin(client, admin):
    resp = client.post(
        f"{API}/users", json={**NEW_USER, "role": "admin"}, headers=auth(admin)
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "admin"


def test_manager_cannot_promote_self_or_others(client, manager, plain):
    resp = client.put(
        f"{API}/users/{manager.id}", json={"role": "admin"}, headers=auth(manager)
    )
    assert resp.status_code == 403
    resp = client.put(
        f"{API}/users/{plain.id}", json={"role": "admin"}, headers=auth(manager)
    )
    assert resp.status_code == 403
    assert (
        client.get(f"{API}/users/{manager.id}", headers=auth(manager)).json()["role"]
        == "manager"
    )


def test_manager_can_make_ordinary_edits(client, manager, plain):
    resp = client.put(
        f"{API}/users/{plain.id}",
        json={"role": "viewer", "full_name": "Renamed", "is_active": False},
        headers=auth(manager),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "viewer"
    assert (
        client.delete(f"{API}/users/{plain.id}", headers=auth(manager)).status_code
        == 204
    )


def test_manager_cannot_modify_admin_account(client, admin, manager):
    h = auth(manager)
    for body in (
        {"full_name": "pwned"},
        {"is_active": False},
        {"role": "user"},
        {"email": "x@example.com"},
    ):
        resp = client.put(f"{API}/users/{admin.id}", json=body, headers=h)
        assert resp.status_code == 403, body
    assert client.delete(f"{API}/users/{admin.id}", headers=h).status_code == 403
    resp = client.put(
        f"{API}/users/{admin.id}/password",
        json={"new_password": "hackedpass1"},
        headers=h,
    )
    assert resp.status_code == 403
    # admin account untouched
    after = client.get(f"{API}/users/{admin.id}", headers=auth(admin)).json()
    assert after["role"] == "admin" and after["is_active"] is True
    assert after["full_name"] == "Boss"


def test_admin_can_manage_admins(client, db, admin):
    other = make_user(db, "boss2", UserRole.ADMIN)
    h = auth(admin)
    assert (
        client.put(
            f"{API}/users/{other.id}", json={"is_active": False}, headers=h
        ).status_code
        == 200
    )
    assert (
        client.put(
            f"{API}/users/{other.id}/password",
            json={"new_password": "resetpass12"},
            headers=h,
        ).status_code
        == 200
    )
    assert client.delete(f"{API}/users/{other.id}", headers=h).status_code == 204


def test_manager_password_rules_unchanged(client, manager, plain):
    h = auth(manager)
    # others' passwords: 403 even for non-admins
    resp = client.put(
        f"{API}/users/{plain.id}/password",
        json={"new_password": "resetpass12"},
        headers=h,
    )
    assert resp.status_code == 403
    # own password: needs the current one
    resp = client.put(
        f"{API}/users/{manager.id}/password",
        json={"new_password": "resetpass12"},
        headers=h,
    )
    assert resp.status_code == 400
    from tests.helpers import PASSWORD

    resp = client.put(
        f"{API}/users/{manager.id}/password",
        json={"new_password": "resetpass12", "current_password": PASSWORD},
        headers=h,
    )
    assert resp.status_code == 200
