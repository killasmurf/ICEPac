"""Report job database model for async report generation tracking."""
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from app.core.database import Base


class ReportJob(Base):
    """Tracks async report generation jobs."""
    __tablename__ = "report_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    report_type = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    # pending -> generating -> completed -> expired | failed
    parameters = Column(JSON, nullable=True)  # Filter params used
    result_summary = Column(JSON, nullable=True)  # Row count, totals, etc.
    output_format = Column(String(10), nullable=False, default="json")  # json|pdf|xlsx|docx|csv
    file_path = Column(String(500), nullable=True)  # S3 key or local path for exported file
    file_size = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    row_count = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # Auto-cleanup
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
