"""Audit log database model for tracking all system changes."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    """Audit log model for tracking system changes.
    
    Records all CREATE, UPDATE, DELETE operations along with
    user authentication events (LOGIN, LOGOUT, FAILED_LOGIN).
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship to user (optional, for when user is deleted)
    user = relationship("User", backref="audit_logs", lazy="joined")

    def __repr__(self):
        return (
            f"<AuditLog(id={self.id}, action='{self.action}', "
            f"entity='{self.entity_type}:{self.entity_id}')>"
        )


# Action constants
class AuditAction:
    """Constants for audit log actions."""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    FAILED_LOGIN = "FAILED_LOGIN"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    ROLE_CHANGE = "ROLE_CHANGE"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
