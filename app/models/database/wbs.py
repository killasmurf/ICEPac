"""Work Breakdown Structure database model."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class WBS(Base):
    """WBS model - maps to legacy tblWBS.

    Enhanced in Phase 3 with hierarchy support, duration, progress,
    and task classification flags for MS Project import.
    """

    __tablename__ = "wbs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    task_unique_id = Column(Integer, nullable=True, index=True)
    wbs_code = Column(String(100), nullable=True)
    wbs_title = Column(String(500), nullable=False)

    # Hierarchy (Phase 3)
    outline_level = Column(Integer, default=0, nullable=False)
    parent_id = Column(Integer, ForeignKey("wbs.id"), nullable=True, index=True)

    # Schedule dates
    schedule_start = Column(DateTime, nullable=True)
    schedule_finish = Column(DateTime, nullable=True)
    baseline_start = Column(DateTime, nullable=True)
    baseline_finish = Column(DateTime, nullable=True)
    late_start = Column(DateTime, nullable=True)
    late_finish = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_finish = Column(DateTime, nullable=True)

    # Duration (Phase 3)
    duration = Column(Float, nullable=True)
    duration_units = Column(String(20), nullable=True)

    # Progress (Phase 3)
    percent_complete = Column(Float, default=0.0)

    # Cost
    cost = Column(Numeric(18, 2), default=0)
    baseline_cost = Column(Numeric(18, 2), default=0)

    # Task classification flags (Phase 3)
    is_milestone = Column(Boolean, default=False, nullable=False)
    is_summary = Column(Boolean, default=False, nullable=False)
    is_critical = Column(Boolean, default=False, nullable=False)

    # Display cache (Phase 3)
    resource_names = Column(String(1000), nullable=True)
    notes = Column(Text, nullable=True)

    # Estimation fields (legacy)
    requirements = Column(Text, nullable=True)
    assumptions = Column(Text, nullable=True)
    approver = Column(String(255), nullable=True)
    approver_date = Column(DateTime, nullable=True)
    estimate_revision = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    project = relationship("Project", back_populates="wbs_items")
    parent = relationship("WBS", remote_side=[id], back_populates="children")
    children = relationship(
        "WBS", back_populates="parent", cascade="all, delete-orphan"
    )
    assignments = relationship(
        "ResourceAssignment", back_populates="wbs_item", cascade="all, delete-orphan"
    )
    risks = relationship(
        "Risk", back_populates="wbs_item", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<WBS(id={self.id}, code='{self.wbs_code}', title='{self.wbs_title}')>"
