"""Project database model."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    """Project lifecycle status."""
    DRAFT = "draft"
    IMPORTING = "importing"
    IMPORTED = "imported"
    IMPORT_FAILED = "import_failed"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ProjectSourceFormat(str, enum.Enum):
    """Source file format."""
    MPP = "mpp"
    MPX = "mpx"
    XML = "xml"
    MANUAL = "manual"


class Project(Base):
    """Project model - maps to legacy tblProjects."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(255), nullable=False, index=True)
    project_manager = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Source file tracking (Phase 3)
    source_file = Column(String(500), nullable=True)
    source_format = Column(SQLEnum(ProjectSourceFormat), nullable=True)
    s3_key = Column(String(1000), nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False)

    # Project schedule dates (from MS Project)
    start_date = Column(DateTime, nullable=True)
    finish_date = Column(DateTime, nullable=True)
    baseline_start = Column(DateTime, nullable=True)
    baseline_finish = Column(DateTime, nullable=True)

    # Cached counts for quick display
    task_count = Column(Integer, default=0)
    resource_count = Column(Integer, default=0)

    # Owner FK to users table
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    wbs_items = relationship("WBS", back_populates="project", cascade="all, delete-orphan")
    import_jobs = relationship("ImportJob", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.project_name}')>"
