"""
Common dependencies for FastAPI endpoints.
"""
from typing import Optional

from fastapi import Header, HTTPException, status


async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    Verify API key from header.

    This is an optional additional layer of security for API access.
    """
    # TODO: Implement API key verification if needed
    # For now, just pass through
    return x_api_key or ""


async def get_pagination_params(
    skip: int = 0, limit: int = 100, max_limit: int = 1000
) -> dict:
    """
    Get pagination parameters.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        max_limit: Maximum allowed limit

    Returns:
        Dictionary with skip and limit values
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip value must be non-negative",
        )

    if limit < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit value must be positive",
        )

    if limit > max_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limit value cannot exceed {max_limit}",
        )

    return {"skip": skip, "limit": limit}
