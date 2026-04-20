"""Audit log Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    skip: int
    limit: int
