from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.models.project import Base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://icepac:icepac_dev_password@localhost:5432/icepac")

# Convert to async database URL if not already
if DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# Sync engine for migrations
sync_engine = create_engine(
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"),
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Async engine for application
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Session makers
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

SessionLocal = sessionmaker(
    sync_engine,
    autoflush=False,
    autocommit=False
)


def init_db():
    """Initialize database tables (sync)"""
    Base.metadata.create_all(bind=sync_engine)


async def init_db_async():
    """Initialize database tables (async)"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get database session for FastAPI endpoints

    Usage:
        @app.get("/endpoint")
        async def endpoint(db: AsyncSession = Depends(get_db)):
            # use db session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db():
    """Close database connections"""
    await async_engine.dispose()
