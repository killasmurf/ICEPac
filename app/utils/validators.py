"""
File and input validation utilities.

This module provides comprehensive validation functions for file uploads,
user inputs, and data sanitization used throughout the ICEPac application.
"""
import re
import os
from typing import Optional, List, Tuple
from pathlib import Path


# Default allowed file extensions for MS Project files
ALLOWED_EXTENSIONS = [".mpp", ".mpx", ".xml"]

# Default maximum file size (100 MB)
DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024

# Minimum file size (100 bytes) to catch empty/corrupt files
MIN_FILE_SIZE = 100

# Content type mappings for MS Project files
CONTENT_TYPE_MAP = {
    ".mpp": "application/vnd.ms-project",
    ".mpx": "application/x-project",
    ".xml": "application/xml",
}


def validate_file_extension(
    filename: str,
    allowed_extensions: Optional[List[str]] = None
) -> Tuple[bool, str]:
    """
    Validate that a file has an allowed extension.
    
    Args:
        filename: The name of the file to validate
        allowed_extensions: List of allowed extensions (e.g., ['.mpp', '.xml'])
                          If None, uses default ALLOWED_EXTENSIONS
    
    Returns:
        Tuple of (is_valid, message)
    """
    if not filename:
        return False, "Filename cannot be empty"
    
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_EXTENSIONS
    
    # Normalize extensions to lowercase with leading dot
    normalized_extensions = []
    for ext in allowed_extensions:
        ext = ext.lower()
        if not ext.startswith('.'):
            ext = '.' + ext
        normalized_extensions.append(ext)
    
    # Get file extension
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    
    if not ext:
        return False, "File has no extension"
    
    if ext not in normalized_extensions:
        return False, f"Invalid file type '{ext}'. Allowed: {', '.join(normalized_extensions)}"
    
    return True, "Valid file extension"


def validate_file_size(
    file_size: int,
    max_size: Optional[int] = None,
    min_size: Optional[int] = None
) -> Tuple[bool, str]:
    """
    Validate that a file size is within acceptable bounds.
    
    Args:
        file_size: Size of the file in bytes
        max_size: Maximum allowed size in bytes (default: DEFAULT_MAX_FILE_SIZE)
        min_size: Minimum allowed size in bytes (default: MIN_FILE_SIZE)
    
    Returns:
        Tuple of (is_valid, message)
    """
    if max_size is None:
        max_size = DEFAULT_MAX_FILE_SIZE
    if min_size is None:
        min_size = MIN_FILE_SIZE
    
    if file_size < min_size:
        return False, f"File too small ({file_size} bytes). Minimum: {min_size} bytes"
    
    if file_size > max_size:
        size_mb = file_size / (1024 * 1024)
        max_mb = max_size / (1024 * 1024)
        return False, f"File too large ({size_mb:.1f} MB). Maximum: {max_mb:.1f} MB"
    
    return True, "Valid file size"


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and injection attacks.
    
    Args:
        filename: The original filename
    
    Returns:
        Sanitized filename safe for filesystem use
    """
    if not filename:
        return "unnamed_file"
    
    # Get just the filename, removing any directory components
    filename = os.path.basename(filename)
    
    # Remove path traversal sequences
    filename = filename.replace("..", "")
    filename = filename.replace("/", "_")
    filename = filename.replace("\\", "_")
    
    # Remove or replace potentially dangerous characters
    # Keep alphanumeric, dots, hyphens, underscores, and spaces
    sanitized = re.sub(r'[^a-zA-Z0-9._\-\s]', '_', filename)
    
    # Replace multiple underscores/spaces with single underscore
    sanitized = re.sub(r'[_\s]+', '_', sanitized)
    
    # Remove leading/trailing underscores and dots
    sanitized = sanitized.strip('_.')
    
    # Ensure we have a valid filename
    if not sanitized:
        return "unnamed_file"
    
    # Limit filename length (preserve extension)
    max_length = 255
    if len(sanitized) > max_length:
        name, ext = os.path.splitext(sanitized)
        name = name[:max_length - len(ext)]
        sanitized = name + ext
    
    return sanitized


def validate_project_name(name: str, max_length: int = 255) -> Tuple[bool, str]:
    """
    Validate a project name.
    
    Args:
        name: The project name to validate
        max_length: Maximum allowed length (default: 255)
    
    Returns:
        Tuple of (is_valid, message)
    """
    if not name or not name.strip():
        return False, "Project name cannot be empty"
    
    name = name.strip()
    
    if len(name) > max_length:
        return False, f"Project name too long ({len(name)} chars). Maximum: {max_length}"
    
    return True, "Valid project name"


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate an email address format.
    
    Args:
        email: The email address to validate
    
    Returns:
        Tuple of (is_valid, message)
    """
    if not email:
        return False, "Email cannot be empty"
    
    # Basic email pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(pattern, email):
        return False, "Invalid email format"
    
    return True, "Valid email"


def validate_positive_integer(
    value: any,
    field_name: str = "Value",
    min_value: int = 1,
    max_value: Optional[int] = None
) -> Tuple[bool, int, str]:
    """
    Validate and convert a value to a positive integer.
    
    Args:
        value: The value to validate
        field_name: Name of the field for error messages
        min_value: Minimum allowed value (default: 1)
        max_value: Maximum allowed value (optional)
    
    Returns:
        Tuple of (is_valid, converted_value, message)
    """
    try:
        int_value = int(value)
    except (ValueError, TypeError):
        return False, 0, f"{field_name} must be a valid integer"
    
    if int_value < min_value:
        return False, 0, f"{field_name} must be at least {min_value}"
    
    if max_value is not None and int_value > max_value:
        return False, 0, f"{field_name} must not exceed {max_value}"
    
    return True, int_value, "Valid integer"


def validate_uuid(uuid_string: str) -> Tuple[bool, str]:
    """
    Validate a UUID string format.
    
    Args:
        uuid_string: The UUID string to validate
    
    Returns:
        Tuple of (is_valid, message)
    """
    if not uuid_string:
        return False, "UUID cannot be empty"
    
    # UUID pattern (with or without hyphens)
    pattern = r'^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$'
    
    if not re.match(pattern, uuid_string):
        return False, "Invalid UUID format"
    
    return True, "Valid UUID"


def get_content_type(filename: str) -> str:
    """
    Get the appropriate content type for a file based on its extension.
    
    Args:
        filename: The filename to check
    
    Returns:
        Content type string
    """
    if not filename:
        return "application/octet-stream"
    
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    
    return CONTENT_TYPE_MAP.get(ext, "application/octet-stream")


def validate_file(
    filename: str,
    file_size: int,
    allowed_extensions: Optional[List[str]] = None,
    max_size: Optional[int] = None
) -> Tuple[bool, List[str]]:
    """
    Perform comprehensive file validation.
    
    Args:
        filename: The name of the file
        file_size: Size of the file in bytes
        allowed_extensions: List of allowed extensions
        max_size: Maximum allowed size in bytes
    
    Returns:
        Tuple of (is_valid, list_of_error_messages)
    """
    errors = []
    
    # Validate extension
    ext_valid, ext_msg = validate_file_extension(filename, allowed_extensions)
    if not ext_valid:
        errors.append(ext_msg)
    
    # Validate size
    size_valid, size_msg = validate_file_size(file_size, max_size)
    if not size_valid:
        errors.append(size_msg)
    
    return len(errors) == 0, errors
