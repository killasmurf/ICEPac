"""Audit service for logging system changes."""
from datetime import datetime
from typing import Any, List, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.database.audit_log import AuditAction, AuditLog
from app.repositories.audit_repository import AuditRepository


class AuditService:
    """Service for creating and querying audit logs.

    Usage:
        audit = AuditService(db)
        audit.log_create(
            user_id=1, entity_type="Resource", entity_id=5, new_values={...}
        )
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = AuditRepository(db)

    def log_action(
        self,
        action: str,
        entity_type: str,
        user_id: Optional[int] = None,
        entity_id: Optional[int] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log an action to the audit trail.

        Args:
            action: The action type (use AuditAction constants)
            entity_type: The type of entity being modified (e.g., 'Resource', 'User')
            user_id: The ID of the user performing the action
            entity_id: The ID of the entity being modified
            old_values: The previous values (for updates)
            new_values: The new values (for creates/updates)
            request: The FastAPI request object (for IP/user agent)
        """
        ip_address = None
        user_agent = None

        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        data = {
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_values": old_values,
            "new_values": new_values,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }

        return self.repository.create(data)

    # Convenience methods for common actions

    def log_create(
        self,
        entity_type: str,
        entity_id: int,
        new_values: dict,
        user_id: Optional[int] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a CREATE action."""
        return self.log_action(
            action=AuditAction.CREATE,
            entity_type=entity_type,
            entity_id=entity_id,
            new_values=new_values,
            user_id=user_id,
            request=request,
        )

    def log_update(
        self,
        entity_type: str,
        entity_id: int,
        old_values: dict,
        new_values: dict,
        user_id: Optional[int] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log an UPDATE action."""
        return self.log_action(
            action=AuditAction.UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            user_id=user_id,
            request=request,
        )

    def log_delete(
        self,
        entity_type: str,
        entity_id: int,
        old_values: dict,
        user_id: Optional[int] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a DELETE action."""
        return self.log_action(
            action=AuditAction.DELETE,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            user_id=user_id,
            request=request,
        )

    def log_login(self, user_id: int, request: Optional[Request] = None) -> AuditLog:
        """Log a LOGIN action."""
        return self.log_action(
            action=AuditAction.LOGIN,
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            request=request,
        )

    def log_logout(self, user_id: int, request: Optional[Request] = None) -> AuditLog:
        """Log a LOGOUT action."""
        return self.log_action(
            action=AuditAction.LOGOUT,
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            request=request,
        )

    def log_failed_login(
        self, username: str, request: Optional[Request] = None
    ) -> AuditLog:
        """Log a FAILED_LOGIN action."""
        return self.log_action(
            action=AuditAction.FAILED_LOGIN,
            entity_type="User",
            new_values={"username": username},
            request=request,
        )

    def log_password_change(
        self, user_id: int, request: Optional[Request] = None
    ) -> AuditLog:
        """Log a PASSWORD_CHANGE action."""
        return self.log_action(
            action=AuditAction.PASSWORD_CHANGE,
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            request=request,
        )

    def log_role_change(
        self,
        user_id: int,
        target_user_id: int,
        old_role: str,
        new_role: str,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a ROLE_CHANGE action."""
        return self.log_action(
            action=AuditAction.ROLE_CHANGE,
            entity_type="User",
            entity_id=target_user_id,
            user_id=user_id,
            old_values={"role": old_role},
            new_values={"role": new_role},
            request=request,
        )

    # Query methods

    def get(self, audit_id: int) -> Optional[AuditLog]:
        """Get an audit log by ID."""
        return self.repository.get(audit_id)

    def get_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        """Get audit logs with optional filters."""
        return self.repository.get_filtered(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
        )

    def count_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Count audit logs with optional filters."""
        return self.repository.count_filtered(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            start_date=start_date,
            end_date=end_date,
        )

    def get_recent(self, limit: int = 50) -> List[AuditLog]:
        """Get most recent audit logs."""
        return self.repository.get_recent(limit=limit)

    def get_entity_history(
        self, entity_type: str, entity_id: int, skip: int = 0, limit: int = 100
    ) -> List[AuditLog]:
        """Get audit history for a specific entity."""
        return self.repository.get_by_entity(
            entity_type=entity_type, entity_id=entity_id, skip=skip, limit=limit
        )

    def get_user_activity(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[AuditLog]:
        """Get audit logs for a specific user."""
        return self.repository.get_by_user(user_id=user_id, skip=skip, limit=limit)

    def get_actions_summary(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> dict:
        """Get summary of actions within a date range."""
        return self.repository.get_actions_summary(
            start_date=start_date, end_date=end_date
        )


def serialize_for_audit(obj: Any, exclude_fields: Optional[List[str]] = None) -> dict:
    """Serialize an object for audit logging.

    Converts SQLAlchemy model to dict, excluding sensitive fields.

    Args:
        obj: The object to serialize
        exclude_fields: Fields to exclude (default: passwords, hashes)
    """
    if exclude_fields is None:
        exclude_fields = ["hashed_password", "password", "_sa_instance_state"]

    result = {}
    for key, value in obj.__dict__.items():
        if key.startswith("_") or key in exclude_fields:
            continue
        # Convert datetime to string
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        # Convert Decimal to float
        elif hasattr(value, "__float__"):
            result[key] = float(value)
        else:
            result[key] = value

    return result
