"""Tests for GET /api/v1/auth/me."""

from app.core.security import create_access_token, get_password_hash
from app.models.database.user import User, UserRole

URL = "/api/v1/auth/me"


def _make_user(db) -> User:
    user = User(
        email="me@example.com",
        username="meuser",
        hashed_password=get_password_hash("password123"),
        full_name="Me User",
        role=UserRole.MANAGER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_me_returns_current_user(client, db):
    user = _make_user(db)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    resp = client.get(URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == user.id
    assert data["username"] == "meuser"
    assert data["email"] == "me@example.com"
    assert data["role"] == "manager"
    assert data["full_name"] == "Me User"
    assert "hashed_password" not in data
    assert "password" not in data


def test_me_without_token_is_401(client):
    assert client.get(URL).status_code == 401


def test_me_with_malformed_token_is_401(client):
    resp = client.get(URL, headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401
