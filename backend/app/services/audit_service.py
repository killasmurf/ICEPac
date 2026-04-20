"""Audit service for logging and retrieving admin operation history."""
import json
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.repositories.audit_repository import AuditRepository


def serialize_for_audit(obj: Any) -> Optional[dict]:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: str(v) for k, v in obj.items()}
    result = {}
    for key in dir(obj):
        if key.startswith("_") or key in ("metadata", "registry"):
            continue
        try:
            val = getattr(obj, key)
            if callable(val):
                continue
            if isinstance(val, datetime):
                result[key] = val.isoformat()
            elif isinstance(val, (str, int, float, bool, type(None))):
                result[key] = val
        except Exception:
            continue
    return result


class AuditService:
    def __init__(self, db: Session):
        self.repo = AuditRepository(db)

    def log(self, user_id: int, username: str, action: str, entity_type: str,
            entity_id: Optional[int] = None, details: Optional[str] = None,
            old_values: Optional[dict] = None, new_values: Optional[dict] = None,
            ip_address: Optional[str] = None):
        return self.repo.log_action(user_id=user_id, username=username, action=action,
                                     entity_type=entity_type, entity_id=entity_id, details=details,
                                     old_values=old_values, new_values=new_values, ip_address=ip_address)

    def get_logs(self, skip: int = 0, limit: int = 50, action: Optional[str] = None,
                 entity_type: Optional[str] = None, user_id: Optional[int] = None,
                 since: Optional[datetime] = None) -> Dict[str, Any]:
        if user_id:
            items = self.repo.get_by_user(user_id, skip=skip, limit=limit)
        else:
            items = self.repo.get_recent(skip=skip, limit=limit, action=action, entity_type=entity_type, since=since)
        total = self.repo.count_recent(action=action, entity_type=entity_type, since=since)
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def get_log(self, log_id: int):
        from fastapi import HTTPException, status
        log = self.repo.get_by_id(log_id)
        if not log:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Audit log {log_id} not found")
        return log

    def get_entity_history(self, entity_type: str, entity_id: int, skip: int = 0, limit: int = 50):
        items = self.repo.get_by_entity(entity_type, entity_id, skip=skip, limit=limit)
        return {"items": items, "entity_type": entity_type, "entity_id": entity_id}
