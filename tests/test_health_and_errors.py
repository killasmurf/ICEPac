"""F-08 (health SELECT 1), F-09 (recent activity actor), F-10 (CORS on 500),
F-12 (health-detailed must not block the event loop)."""

import asyncio
import inspect
import threading
import time
from unittest.mock import patch

import httpx
import pytest
from sqlalchemy import event

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.models.database.audit_log import AuditLog
from app.models.database.user import UserRole
from app.routes import dashboard
from tests.helpers import auth, make_user

NO_S3 = {"status": "unavailable", "note": "non-critical for local dev"}


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


# ---- F-08 -------------------------------------------------------------------


def test_health_reports_database_healthy(client, db):
    with patch("app.core.database.SessionLocal", return_value=db):
        body = client.get("/health").json()
    assert body["database"] == "healthy", body
    assert body["status"] == "healthy"


def test_health_detailed_reports_database_healthy(client, admin):
    with patch.object(dashboard, "_check_s3", return_value=NO_S3):
        body = client.get("/api/v1/dashboard/health-detailed", headers=auth(admin))
    assert body.status_code == 200
    data = body.json()
    assert data["database"] == {"status": "healthy"}, data["database"]
    assert data["overall"] == "healthy"


# ---- F-09 -------------------------------------------------------------------


def test_recent_activity_resolves_actor_username(client, db, admin):
    other = make_user(db, "carol", UserRole.USER)
    db.add_all(
        [
            AuditLog(user_id=admin.id, action="CREATE", entity_type="X"),
            AuditLog(user_id=other.id, action="UPDATE", entity_type="Y"),
            AuditLog(user_id=None, action="DELETE", entity_type="Z"),
        ]
    )
    db.commit()
    resp = client.get("/api/v1/dashboard/stats", headers=auth(admin))
    assert resp.status_code == 200
    by_action = {a["action"]: a["username"] for a in resp.json()["recent_activity"]}
    assert by_action == {"CREATE": "boss", "UPDATE": "carol", "DELETE": None}


def test_recent_activity_is_not_n_plus_one(db, admin):
    for i in range(5):
        u = make_user(db, f"user{i}", UserRole.USER)
        db.add(AuditLog(user_id=u.id, action="CREATE", entity_type="X"))
    db.commit()
    db.expire_all()
    statements = []

    def count(conn, cursor, statement, *a):
        statements.append(statement)

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", count)
    try:
        rows = dashboard._recent_activity(db)
    finally:
        event.remove(engine, "before_cursor_execute", count)
    assert len(rows) == 5 and all(r["username"] for r in rows)
    assert len(statements) == 1, statements


# ---- F-10 -------------------------------------------------------------------


def _boom():
    raise RuntimeError("boom")


def test_unhandled_exception_returns_500_json_with_cors_headers(client):
    origin = settings.ALLOWED_ORIGINS[0]
    app.dependency_overrides[get_current_user] = _boom
    resp = client.get("/api/v1/auth/me", headers={"Origin": origin})
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Internal server error"
    assert resp.headers["access-control-allow-origin"] == origin
    assert resp.headers["access-control-allow-credentials"] == "true"


def test_unhandled_exception_does_not_leak_cors_to_unknown_origins(client):
    app.dependency_overrides[get_current_user] = _boom
    resp = client.get("/api/v1/auth/me", headers={"Origin": "http://evil.example"})
    assert resp.status_code == 500
    assert "access-control-allow-origin" not in resp.headers


def test_preflight_still_answered(client):
    origin = settings.ALLOWED_ORIGINS[0]
    resp = client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == origin


# ---- F-12 -------------------------------------------------------------------


def test_health_detailed_is_not_a_coroutine():
    """A plain ``def`` runs in the threadpool, off the event loop."""
    assert not inspect.iscoroutinefunction(dashboard.health_detailed)
    from app.main import health_check

    assert not inspect.iscoroutinefunction(health_check)


def test_s3_probe_uses_short_timeouts():
    captured = {}

    def fake_client(service, **kwargs):
        captured.update(kwargs)
        raise RuntimeError("stop here")

    with patch("app.services.s3_service.boto3.client", fake_client):
        result = dashboard._check_s3()
    cfg = captured["config"]
    assert cfg.connect_timeout == 2
    assert cfg.read_timeout == 2
    assert cfg.retries["max_attempts"] == 1
    assert result["status"] == "unavailable"


@pytest.mark.asyncio
async def test_slow_health_check_does_not_delay_other_requests(db, admin):
    probe_started = threading.Event()
    marks = {}

    def slow_s3():
        marks["probe_started"] = time.perf_counter()
        probe_started.set()
        time.sleep(1.5)  # a blocking probe, like boto3 against a dead endpoint
        return NO_S3

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as ac:
            with patch.object(dashboard, "_check_s3", slow_s3):
                slow = asyncio.create_task(
                    ac.get("/api/v1/dashboard/health-detailed", headers=auth(admin))
                )
                # Wait until the blocking probe is running, then issue another
                # request. If the probe blocked the event loop, this loop could
                # not even resume until it finished (1.5 s later).
                while not probe_started.is_set():
                    await asyncio.sleep(0.01)
                fast = await ac.get("/")
                fast_done = time.perf_counter()
                slow_resp = await slow
    finally:
        app.dependency_overrides.clear()
    assert fast.status_code == 200
    assert slow_resp.status_code == 200
    delay = fast_done - marks["probe_started"]
    assert delay < 0.75, f"other request waited {delay:.2f}s behind the probe"
