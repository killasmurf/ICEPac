"""
ICEPac FastAPI Application
Cost Estimation & Project Risk Management System
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.database import engine, init_db
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format=settings.LOG_FORMAT,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")
    engine.dispose()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Middleware (order matters - last added is first executed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)


# ---------------------------------------------------------------------------
# System endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health_check():
    """
    Health check — verifies database connectivity and (optionally) Redis.
    Returns 200 if all required services are up, 503 otherwise.
    """
    from sqlalchemy import text
    from fastapi import Response
    import redis as redis_lib

    checks: dict = {}
    healthy = True

    # Database
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc}"
        healthy = False

    # Redis (optional — degraded but not fatal)
    try:
        r = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"unavailable: {exc}"
        # Redis is not critical for basic operation

    return {
        "status": "healthy" if healthy else "unhealthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": checks,
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint - API information."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "docs": "/docs",
        "health": "/health",
    }


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from app.routes import auth, admin  # noqa: E402
from app.routes.project import router as project_router  # noqa: E402

app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(admin.router, prefix=settings.API_V1_PREFIX, tags=["Admin"])
app.include_router(project_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
