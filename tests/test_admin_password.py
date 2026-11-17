"""Tests for PUT /api/v1/admin/users/{user_id}/password."""

import pytest

from app.core.security import create_access_token, get_password_hash
from app.models.database.audit_log import AuditAction, AuditLog
from app.models.database.user import User, UserRole

OLD = "oldpassword1"
NEW = "brandnewpass1"


def _make_user(db, name: str, role: UserRole) -> User:
    user = User(
        email=f"{name}@example.com",
        username=name,
        hashed_password=get_password_hash(OLD),
        full_name=name.title(),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def _put(client, actor: User, target_id: int, body: dict):
    return client.put(
        f"/api/v1/admin/users/{target_id}/password",
        json=body,
        headers=_auth(actor),
    )


def _login(client, username: str, password: str) -> int:
    return client.post(
        "/api/v1/auth/login", data={"username": username, "password": password}
    ).status_code


@pytest.fixture
def admin(db):
    return _make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def manager(db):
    return _make_user(db, "mgr", UserRole.MANAGER)


@pytest.fixture
def target(db):
    return _make_user(db, "target", UserRole.USER)


def test_admin_resets_other_user_without_current_password(client, db, admin, target):
    resp = _put(client, admin, target.id, {"new_password": NEW})
    assert resp.status_code == 200
    assert _login(client, "target", NEW) == 200
    assert _login(client, "target", OLD) == 401


def test_admin_reset_ignores_supplied_current_password(client, admin, target):
    resp = _put(
        client, admin, target.id, {"current_password": "wrong", "new_password": NEW}
    )
    assert resp.status_code == 200
    assert _login(client, "target", NEW) == 200


def test_admin_reset_is_audited_against_admin(client, db, admin, target):
    assert _put(client, admin, target.id, {"new_password": NEW}).status_code == 200
    rows = (
        db.query(AuditLog).filter(AuditLog.action == AuditAction.PASSWORD_CHANGE).all()
    )
    assert len(rows) == 1
    assert rows[0].entity_id == target.id
    assert rows[0].user_id == admin.id
    assert NEW not in str(rows[0].new_values) + str(rows[0].old_values)


def test_admin_own_password_requires_current(client, admin):
    resp = _put(client, admin, admin.id, {"new_password": NEW})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Current password is required"


def test_admin_own_password_wrong_current(client, admin):
    resp = _put(
        client, admin, admin.id, {"current_password": "nope", "new_password": NEW}
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Incorrect current password"
    assert _login(client, "boss", OLD) == 200


def test_admin_own_password_correct_current(client, admin):
    resp = _put(client, admin, admin.id, {"current_password": OLD, "new_password": NEW})
    assert resp.status_code == 200
    assert _login(client, "boss", NEW) == 200


def test_manager_cannot_reset_other_user(client, manager, target):
    for body in (
        {"new_password": NEW},
        {"current_password": OLD, "new_password": NEW},
    ):
        resp = _put(client, manager, target.id, body)
        assert resp.status_code == 403
    assert _login(client, "target", OLD) == 200
    assert _login(client, "target", NEW) == 401


def test_manager_own_password_with_correct_current(client, manager):
    resp = _put(
        client, manager, manager.id, {"current_password": OLD, "new_password": NEW}
    )
    assert resp.status_code == 200
    assert _login(client, "mgr", NEW) == 200


def test_unknown_user_is_404(client, admin):
    assert _put(client, admin, 99999, {"new_password": NEW}).status_code == 404


def test_short_new_password_is_422(client, admin, target):
    resp = _put(client, admin, target.id, {"new_password": "short"})
    assert resp.status_code == 422
    assert _login(client, "target", OLD) == 200
