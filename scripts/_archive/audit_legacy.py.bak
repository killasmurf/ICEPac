"""Audit log database model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text

from app.core.database import Base


class AuditLog(Base):
    """Audit log - maps to legacy tblLog."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, user='{self.username}', action='{self.action}')>"
