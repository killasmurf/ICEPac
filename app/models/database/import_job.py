"""Import job database model for tracking MS Project file imports."""
import enum
from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ImportStatus(str, enum.Enum):
    """Import job lifecycle status."""

    PENDING = "pending"
    UPLOADING = "uploading"
    PARSING = "parsing"
    CREATING_RECORDS = "creating_records"
    COMPLETED = "completed"
    FAILED = "failed"


class ImportJob(Base):
    """Tracks async MS Project file import jobs."""

    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # File info
    filename = Column(String(500), nullable=False)
    s3_key = Column(String(1000), nullable=True)
    file_size = Column(Integer, nullable=True)

    # Status tracking
    status = Column(
        SQLEnum(ImportStatus), default=ImportStatus.PENDING, nullable=False, index=True
    )
    progress = Column(Float, default=0.0, nullable=False)
    celery_task_id = Column(String(255), nullable=True, index=True)

    # Result counts
    task_count = Column(Integer, default=0)
    resource_count = Column(Integer, default=0)
    assignment_count = Column(Integer, default=0)

    # Error tracking
    error_message = Column(Text, nullable=True)

    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    project = relationship("Project", back_populates="import_jobs")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return (
            f"<ImportJob(id={self.id}, "
            f"project_id={self.project_id}, status='{self.status}')>"
        )
