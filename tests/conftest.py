import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.models.project import Base


TEST_DATABASE_URL = "postgresql+asyncpg://icepac:icepac_dev_password@localhost:5432/icepac_test"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
def client(db_session: AsyncSession):
    """Create a test client with database session override"""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_mpp_data():
    """Sample MPP project data for testing"""
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
                "notes": "Test task"
            },
            {
                "id": 2,
                "name": "Task 2",
                "duration": 10.0,
                "start": "2024-01-06T08:00:00",
                "finish": "2024-01-15T17:00:00",
                "percent_complete": 0.0,
                "notes": None
            }
        ],
        "resources": [
            {
                "id": 1,
                "name": "John Doe",
                "email_address": "john@example.com",
                "type": "Work"
            },
            {
                "id": 2,
                "name": "Jane Smith",
                "email_address": "jane@example.com",
                "type": "Work"
            }
        ]
    }
