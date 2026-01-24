"""Work Breakdown Structure database model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class WBS(Base):
    """WBS model - maps to legacy tblWBS."""

    __tablename__ = "wbs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    task_unique_id = Column(Integer, nullable=True, index=True)
    wbs_code = Column(String(100), nullable=True)
    wbs_title = Column(String(500), nullable=False)
    schedule_start = Column(DateTime, nullable=True)
    schedule_finish = Column(DateTime, nullable=True)
    baseline_start = Column(DateTime, nullable=True)
    baseline_finish = Column(DateTime, nullable=True)
    late_start = Column(DateTime, nullable=True)
    late_finish = Column(DateTime, nullable=True)
    cost = Column(Numeric(18, 2), default=0)
    baseline_cost = Column(Numeric(18, 2), default=0)
    requirements = Column(Text, nullable=True)
    assumptions = Column(Text, nullable=True)
    approver = Column(String(255), nullable=True)
    approver_date = Column(DateTime, nullable=True)
    estimate_revision = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="wbs_items")
    assignments = relationship("ResourceAssignment", back_populates="wbs_item", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="wbs_item", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WBS(id={self.id}, code='{self.wbs_code}', title='{self.wbs_title}')>"
