"""
Pytest configuration and fixtures for ICEPac tests.
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def anyio_backend():
    """Use asyncio as the anyio backend."""
    return "asyncio"


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    from sqlalchemy.orm import Session

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
def client():
    """Create a test client with mocked dependencies."""
    from app.core.database import get_db
    from app.core.security import get_current_user
    from app.main import app

    # Create mocks
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
