"""
ICEPac FastAPI Application
Cost Estimation & Project Risk Management System
"""
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
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
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)


# ════════════════════════════════════════════════════════════════
# System Endpoints
# ════════════════════════════════════════════════════════════════


@app.get("/health", tags=["System"])
async def health_check():
    """Comprehensive health check — reports status of all dependencies."""
    from app.core.database import SessionLocal
    from app.services.cache_service import cache

    checks = {"app": "healthy", "version": settings.APP_VERSION}

    # Database
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {type(e).__name__}"

    # Redis/Cache
    checks["cache"] = "healthy" if cache.ping() else "unavailable"

    # Overall
    checks["status"] = "healthy" if checks.get("database") == "healthy" else "degraded"
    return checks


@app.get("/", tags=["System"])
async def root():
    """Root endpoint — API information and available circuits."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "docs": "/docs",
        "health": "/health",
        "circuits": {
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "admin": f"{settings.API_V1_PREFIX}/admin",
            "help": f"{settings.API_V1_PREFIX}/help",
            "projects": f"{settings.API_V1_PREFIX}/projects",
            "estimation": f"{settings.API_V1_PREFIX}/estimation",
            "reports": f"{settings.API_V1_PREFIX}/reports",
        },
    }


@app.get("/api/v1/feature-flags", tags=["System"])
async def get_feature_flags():
    """Get current feature flag status."""
    from app.services.feature_flags import feature_flags

    return feature_flags.get_all()


# ════════════════════════════════════════════════════════════════
# Include Routers
# ════════════════════════════════════════════════════════════════

from app.routes import (  # noqa: E402
    admin,
    auth,
    dashboard,
    estimation,
    help,
    project,
    reports,
    risk,
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(admin.router, prefix=settings.API_V1_PREFIX, tags=["Admin"])
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX, tags=["Dashboard"])
app.include_router(help.router, prefix=settings.API_V1_PREFIX, tags=["Help"])
app.include_router(project.router, prefix=settings.API_V1_PREFIX, tags=["Projects"])
app.include_router(
    estimation.router, prefix=settings.API_V1_PREFIX, tags=["Estimation"]
)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX, tags=["Reports"])

# Risk routers — project-level (cross-cutting risk register)
# WBS-scoped risk CRUD lives in app.routes.estimation
app.include_router(
    risk.project_risk_router, prefix=settings.API_V1_PREFIX, tags=["Risks"]
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
