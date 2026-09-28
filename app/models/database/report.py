"""Report database models."""
import enum
from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ReportType(str, enum.Enum):
    COST_CONTROL = "cost_control"
    BOE = "boe"
    RISK_SUMMARY = "risk_summary"
    WBS_SUMMARY = "wbs_summary"
    RESOURCE_UTILIZATION = "resource_utilization"


class ReportFormat(str, enum.Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class GeneratedReport(Base):
    """A generated report instance for a project."""

    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    report_type = Column(SQLEnum(ReportType), nullable=False)
    report_format = Column(SQLEnum(ReportFormat), nullable=False, default=ReportFormat.JSON)
    status = Column(SQLEnum(ReportStatus), nullable=False, default=ReportStatus.PENDING)

    title = Column(String(255), nullable=False)
    s3_key = Column(String(1000), nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", foreign_keys=[project_id])
    requester = relationship("User", foreign_keys=[requested_by])

    def __repr__(self):
        return f"<GeneratedReport(id={self.id}, type={self.report_type}, project={self.project_id})>"
