"""Tests for GET /api/v1/admin/config (table listing)."""

import pytest

from app.core.security import create_access_token, get_password_hash
from app.models.database.user import User, UserRole
from app.models.schemas.config import CONFIG_TABLE_INFO

URL = "/api/v1/admin/config"


@pytest.fixture
def headers(db):
    user = User(
        email="cfg@example.com",
        username="cfg",
        hashed_password=get_password_hash("password123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def test_every_table_has_key_and_unchanged_label(client, headers):
    resp = client.get(URL, headers=headers)
    assert resp.status_code == 200
    tables = resp.json()["tables"]
    assert [t["key"] for t in tables] == list(CONFIG_TABLE_INFO)
    for t in tables:
        info = CONFIG_TABLE_INFO[t["key"]]
        assert t["name"] == info["name"]
        assert t["description"] == info["description"]
        assert t["weighted"] == info["weighted"]


def test_every_key_is_a_valid_table_name(client, headers):
    for t in client.get(URL, headers=headers).json()["tables"]:
        resp = client.get(f"{URL}/{t['key']}", headers=headers)
        assert resp.status_code == 200, t["key"]
