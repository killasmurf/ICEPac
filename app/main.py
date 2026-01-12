from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging

from app.routes import project
from app.config import settings
from app.database import init_db_async, close_db
from app.logging_config import setup_logging
from app.exceptions import (
    ICEPacException,
    icepac_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)

# Setup logging
setup_logging(
    log_level="DEBUG" if settings.debug else "INFO",
    json_format=not settings.debug
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    logger.info("Starting ICEPac API...")
    try:
        await init_db_async()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    yield

    # Shutdown
    logger.info("Shutting down ICEPac API...")
    try:
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


app = FastAPI(
    title="ICEPac API",
    description="Microsoft Project File Reader and Analysis API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(ICEPacException, icepac_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(project.router, prefix="/api/v1", tags=["projects"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ICEPac API",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to ICEPac API",
        "docs": "/docs",
        "health": "/health"
    }