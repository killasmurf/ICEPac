"""Audit log repository for tracking admin operations."""
import json
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.repositories.base import BaseRepository
from app.models.database.audit_log import AuditLog


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session):
        super().__init__(AuditLog, db)

    def log_action(self, user_id: int, username: str, action: str, entity_type: str,
                   entity_id: Optional[int] = None, details: Optional[str] = None,
                   old_values: Optional[dict] = None, new_values: Optional[dict] = None,
                   ip_address: Optional[str] = None) -> AuditLog:
        log = AuditLog(
            user_id=user_id, username=username, action=action,
            entity_type=entity_type, entity_id=entity_id, details=details,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_by_entity(self, entity_type: str, entity_id: int, skip: int = 0, limit: int = 50) -> List[AuditLog]:
        return self.db.query(AuditLog).filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    def get_by_user(self, user_id: int, skip: int = 0, limit: int = 50) -> List[AuditLog]:
        return self.db.query(AuditLog).filter(AuditLog.user_id == user_id).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    def get_recent(self, skip: int = 0, limit: int = 50, action: Optional[str] = None,
                   entity_type: Optional[str] = None, since: Optional[datetime] = None) -> List[AuditLog]:
        q = self.db.query(AuditLog)
        if action: q = q.filter(AuditLog.action == action)
        if entity_type: q = q.filter(AuditLog.entity_type == entity_type)
        if since: q = q.filter(AuditLog.created_at >= since)
        return q.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    def count_recent(self, action: Optional[str] = None, entity_type: Optional[str] = None,
                     since: Optional[datetime] = None) -> int:
        q = self.db.query(func.count(AuditLog.id))
        if action: q = q.filter(AuditLog.action == action)
        if entity_type: q = q.filter(AuditLog.entity_type == entity_type)
        if since: q = q.filter(AuditLog.created_at >= since)
        return q.scalar() or 0
