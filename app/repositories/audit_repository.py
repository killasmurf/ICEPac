"""Audit log repository for data access operations."""
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.models.database.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    """Repository for AuditLog operations."""

    def __init__(self, db: Session):
        super().__init__(AuditLog, db)

    def get_by_entity(
        self,
        entity_type: str,
        entity_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs for a specific entity."""
        stmt = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.entity_type == entity_type,
                    AuditLog.entity_id == entity_id
                )
            )
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_user(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs for a specific user."""
        stmt = (
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_filtered(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs with multiple filters."""
        conditions = []
        
        if user_id is not None:
            conditions.append(AuditLog.user_id == user_id)
        if action is not None:
            conditions.append(AuditLog.action == action)
        if entity_type is not None:
            conditions.append(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            conditions.append(AuditLog.entity_id == entity_id)
        if start_date is not None:
            conditions.append(AuditLog.created_at >= start_date)
        if end_date is not None:
            conditions.append(AuditLog.created_at <= end_date)
        
        stmt = select(AuditLog)
        if conditions:
            stmt = stmt.where(and_(*conditions))
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        return list(self.db.scalars(stmt).all())

    def count_filtered(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """Count audit logs with multiple filters."""
        conditions = []
        
        if user_id is not None:
            conditions.append(AuditLog.user_id == user_id)
        if action is not None:
            conditions.append(AuditLog.action == action)
        if entity_type is not None:
            conditions.append(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            conditions.append(AuditLog.entity_id == entity_id)
        if start_date is not None:
            conditions.append(AuditLog.created_at >= start_date)
        if end_date is not None:
            conditions.append(AuditLog.created_at <= end_date)
        
        stmt = select(func.count()).select_from(AuditLog)
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        return self.db.scalar(stmt) or 0

    def get_recent(self, limit: int = 50) -> List[AuditLog]:
        """Get most recent audit logs."""
        stmt = (
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_actions_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """Get summary of actions within a date range."""
        conditions = []
        if start_date:
            conditions.append(AuditLog.created_at >= start_date)
        if end_date:
            conditions.append(AuditLog.created_at <= end_date)
        
        stmt = (
            select(AuditLog.action, func.count(AuditLog.id))
            .group_by(AuditLog.action)
        )
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        results = self.db.execute(stmt).all()
        return {action: count for action, count in results}
