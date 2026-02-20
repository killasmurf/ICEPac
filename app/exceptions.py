import logging

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class ICEPacException(Exception):
    """Base exception for ICEPac application"""

    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ProjectNotFoundException(ICEPacException):
    """Raised when a project is not found"""

    def __init__(self, project_id: str):
        super().__init__(
            message=f"Project with ID {project_id} not found",
            status_code=404,
            details={"project_id": project_id},
        )


class FileProcessingException(ICEPacException):
    """Raised when file processing fails"""

    def __init__(self, message: str, file_name: str = None):
        details = {}
        if file_name:
            details["file_name"] = file_name
        super().__init__(
            message=f"File processing error: {message}",
            status_code=422,
            details=details,
        )


class S3UploadException(ICEPacException):
    """Raised when S3 upload fails"""

    def __init__(self, message: str = "Failed to upload file to S3"):
        super().__init__(message=message, status_code=500, details={"service": "s3"})


class DatabaseException(ICEPacException):
    """Raised when database operation fails"""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(
            message=message, status_code=500, details={"service": "database"}
        )


class InvalidFileTypeException(ICEPacException):
    """Raised when file type is invalid"""

    def __init__(self, file_type: str, allowed_types: list):
        super().__init__(
            message=f"Invalid file type: {file_type}",
            status_code=400,
            details={"file_type": file_type, "allowed_types": allowed_types},
        )


async def icepac_exception_handler(
    request: Request, exc: ICEPacException
) -> JSONResponse:
    """Handler for custom ICEPac exceptions"""
    logger.error(
        f"ICEPac error: {exc.message}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "details": exc.details,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.message,
            "details": exc.details,
            "path": request.url.path,
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handler for FastAPI HTTP exceptions"""
    logger.warning(
        f"HTTP error: {exc.detail}",
        extra={"status_code": exc.status_code, "path": request.url.path},
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "message": exc.detail, "path": request.url.path},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handler for request validation errors"""
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": " -> ".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        f"Validation error: {len(errors)} error(s)",
        extra={"path": request.url.path, "errors": errors},
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "message": "Request validation failed",
            "details": errors,
            "path": request.url.path,
        },
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handler for unhandled exceptions"""
    logger.exception(
        f"Unhandled error: {str(exc)}",
        extra={"path": request.url.path, "exception_type": type(exc).__name__},
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "An unexpected error occurred",
            "path": request.url.path,
        },
    )
