"""Report repository."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database.report import GeneratedReport, ReportStatus
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[GeneratedReport]):

    def __init__(self, db: Session):
        super().__init__(GeneratedReport, db)

    def get_by_project(self, project_id: int, skip: int = 0, limit: int = 50) -> List[GeneratedReport]:
        stmt = (
            select(GeneratedReport)
            .where(GeneratedReport.project_id == project_id)
            .order_by(GeneratedReport.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_project(self, project_id: int) -> int:
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(GeneratedReport)
            .where(GeneratedReport.project_id == project_id)
        )
        return self.db.scalar(stmt) or 0

    def mark_ready(self, report_id: int, s3_key: Optional[str] = None) -> Optional[GeneratedReport]:
        from datetime import datetime
        report = self.get(report_id)
        if report:
            report.status = ReportStatus.READY
            report.completed_at = datetime.utcnow()
            if s3_key:
                report.s3_key = s3_key
            self.db.commit()
            self.db.refresh(report)
        return report

    def mark_failed(self, report_id: int, error: str) -> Optional[GeneratedReport]:
        from datetime import datetime
        report = self.get(report_id)
        if report:
            report.status = ReportStatus.FAILED
            report.error_message = error
            report.completed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(report)
        return report
