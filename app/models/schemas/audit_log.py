"""Audit log schemas for API requests and responses."""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class AuditLogBase(BaseModel):
    """Base audit log schema."""
    action: str = Field(..., max_length=50)
    entity_type: str = Field(..., max_length=100)
    entity_id: Optional[int] = None
    old_values: Optional[dict[str, Any]] = None
    new_values: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    """Schema for creating an audit log entry."""
    user_id: Optional[int] = None


class AuditLogResponse(AuditLogBase):
    """Schema for audit log API response."""
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None  # Populated from relationship
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Paginated list of audit logs."""
    items: list[AuditLogResponse]
    total: int
    skip: int
    limit: int


class AuditLogFilter(BaseModel):
    """Filter parameters for audit log queries."""
    user_id: Optional[int] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
