"""
Pytest configuration and fixtures for ICEPac tests.
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.main import app

# ---------------------------------------------------------------------------
# Real SQLite engine for integration-style unit tests
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
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
