"""
Pytest configuration and fixtures for ICEPac tests.
"""
# Use a temp file (NOT :memory:) so the DB is shared across the thread
# pool that FastAPI's TestClient uses. With in-memory SQLite, each
# connection gets its own DB and the request handler thread sees an
# empty schema — login hangs waiting for a connection that doesn't have
# the user we just added.
import os
import tempfile
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

# ---------------------------------------------------------------------------
# Real SQLite engine for integration-style unit tests
# ---------------------------------------------------------------------------


_TMPDIR = tempfile.mkdtemp(prefix="icepac_test_db_")
TEST_DATABASE_URL = f"sqlite:///{os.path.join(_TMPDIR, 'test.db')}"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # single shared connection; the temp file is
    # the actual cross-thread shared state
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Session:
    """Fresh SQLite database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> TestClient:
    """TestClient with real SQLite DB injected via dependency override."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Async backend
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def anyio_backend():
    """Use asyncio as the anyio backend."""
    return "asyncio"


# ---------------------------------------------------------------------------
# Mock fixtures (for pure unit tests that don't need a real DB)
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return MagicMock(spec=Session)


@pytest.fixture
def clear_ratelimit():
    """Clear Redis rate-limit state before any test that does auth.

    The dev stack's rate limiter is configured at 5 logins per minute
    per client IP. TestClient requests all come from "testclient", so
    running >4 auth-hitting tests in a row hits the limit and the
    next test hangs waiting for the backoff to expire. This fixture
    flushes the rate-limit keys so tests don't depend on prior test
    state.
    """
    try:
        import redis as r

        client = r.from_url(
            "redis://redis:6379/0",
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        if client.ping():
            keys = client.keys("*ratelimit*")
            if keys:
                client.delete(*keys)
    except Exception:
        pass  # If Redis is unavailable, the limiter falls back to no-op
    yield


@pytest.fixture
def mock_current_user():
    """Create a mock current user."""
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.username = "testuser"
    user.role = "admin"
    user.is_active = True
    return user


@pytest.fixture
def mock_client():
    """Create a test client with fully mocked dependencies."""
    from app.core.security import get_current_user

    mock_session = MagicMock()
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"
    mock_user.role = "admin"

    def override_get_db():
        yield mock_session

    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Shared data fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_tasks():
    return [
        {"id": 1, "name": "Design Phase", "start": None, "finish": None},
        {"id": 2, "name": "Build Phase", "start": None, "finish": None},
        {"id": 3, "name": "Test Phase", "start": None, "finish": None},
    ]


@pytest.fixture
def sample_mpp_data():
    """Sample MPP project data for testing."""
    return {
        "name": "Test Project",
        "start_date": "2024-01-01T00:00:00",
        "finish_date": "2024-12-31T23:59:59",
        "duration": 365.0,
        "percent_complete": 25.0,
        "tasks": [
            {
                "id": 1,
                "name": "Task 1",
                "duration": 5.0,
                "start": "2024-01-01T00:00:00",
                "finish": "2024-01-05T17:00:00",
                "percent_complete": 50.0,
                "notes": "Test task",
            },
            {
                "id": 2,
                "name": "Task 2",
                "duration": 10.0,
                "start": "2024-01-06T08:00:00",
                "finish": "2024-01-15T17:00:00",
                "percent_complete": 0.0,
                "notes": None,
            },
        ],
        "resources": [
            {
                "id": 1,
                "name": "John Doe",
                "email_address": "john@example.com",
                "type": "Work",
            },
            {
                "id": 2,
                "name": "Jane Smith",
                "email_address": "jane@example.com",
                "type": "Work",
            },
        ],
    }


@pytest.fixture
def sample_project_create():
    """Sample project creation data."""
    return {"name": "Test Project", "description": "A test project", "code": "TEST-001"}


@pytest.fixture
def sample_user_create():
    """Sample user creation data."""
    return {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "securepassword123",
        "first_name": "New",
        "last_name": "User",
    }


@pytest.fixture
def sample_resource_create():
    """Sample resource creation data."""
    return {
        "name": "Test Resource",
        "resource_type": "Labor",
        "rate": 75.00,
        "rate_unit": "hour",
    }
