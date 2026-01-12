from fastapi import UploadFile, HTTPException
from typing import List
import os
from app.config import settings


def validate_file_type(file: UploadFile, allowed_types: List[str] = None) -> str:
    """
    Validate file type based on extension

    Args:
        file: Uploaded file
        allowed_types: List of allowed file extensions (defaults to config)

    Returns:
        File extension if valid

    Raises:
        HTTPException: If file type is not allowed
    """
    if allowed_types is None:
        allowed_types = settings.allowed_file_types

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required"
        )

    file_ext = os.path.splitext(file.filename)[1].lower().lstrip(".")

    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{file_ext}' not allowed. Allowed types: {', '.join(allowed_types)}"
        )

    return file_ext


def validate_file_size(file: UploadFile, max_size_mb: int = None) -> None:
    """
    Validate file size

    Args:
        file: Uploaded file
        max_size_mb: Maximum file size in MB (defaults to config)

    Raises:
        HTTPException: If file is too large
    """
    if max_size_mb is None:
        max_size_mb = settings.max_upload_size_mb

    # Check content-length header if available
    if hasattr(file, "size") and file.size:
        size_mb = file.size / (1024 * 1024)
        if size_mb > max_size_mb:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({size_mb:.2f} MB) exceeds maximum allowed size ({max_size_mb} MB)"
            )


def validate_project_file(file: UploadFile) -> tuple[str, str]:
    """
    Comprehensive validation for project file uploads

    Args:
        file: Uploaded file

    Returns:
        Tuple of (filename, file_type)

    Raises:
        HTTPException: If validation fails
    """
    if not file:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    # Validate file type
    file_type = validate_file_type(file)

    # Validate file size
    validate_file_size(file)

    # Sanitize filename
    filename = sanitize_filename(file.filename)

    return filename, file_type


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and other issues

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    # Remove path components
    filename = os.path.basename(filename)

    # Remove potentially dangerous characters
    dangerous_chars = ["<", ">", ":", '"', "|", "?", "*", "\0"]
    for char in dangerous_chars:
        filename = filename.replace(char, "_")

    # Limit filename length
    max_length = 255
    name, ext = os.path.splitext(filename)
    if len(filename) > max_length:
        name = name[:max_length - len(ext) - 1]
        filename = name + ext

    return filename


def validate_uuid(value: str, field_name: str = "ID") -> None:
    """
    Validate UUID format

    Args:
        value: UUID string
        field_name: Name of the field for error message

    Raises:
        HTTPException: If UUID is invalid
    """
    try:
        from uuid import UUID
        UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Must be a valid UUID."
        )


def validate_pagination_params(skip: int = 0, limit: int = 100) -> tuple[int, int]:
    """
    Validate pagination parameters

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (skip, limit)

    Raises:
        HTTPException: If parameters are invalid
    """
    if skip < 0:
        raise HTTPException(
            status_code=400,
            detail="Skip parameter must be non-negative"
        )

    if limit <= 0:
        raise HTTPException(
            status_code=400,
            detail="Limit parameter must be positive"
        )

    if limit > 1000:
        raise HTTPException(
            status_code=400,
            detail="Limit parameter cannot exceed 1000"
        )

    return skip, limit
