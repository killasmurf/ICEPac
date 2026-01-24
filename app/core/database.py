"""
Database configuration and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator

from app.core.config import settings

# Create database engine
_engine_kwargs = {"echo": settings.DB_ECHO}
if settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_size"] = settings.DB_POOL_SIZE
    _engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    _engine_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.

    Usage in FastAPI endpoints:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def drop_db() -> None:
    """Drop all database tables. Use with caution!"""
    Base.metadata.drop_all(bind=engine)
