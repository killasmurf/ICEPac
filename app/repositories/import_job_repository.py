"""Import job repository."""
from typing import List, Optional

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.database.import_job import ImportJob
from app.repositories.base import BaseRepository


class ImportJobRepository(BaseRepository[ImportJob]):
    """Repository for import job operations."""

    def __init__(self, db: Session):
        super().__init__(ImportJob, db)

    def get_by_project(self, project_id: int) -> List[ImportJob]:
        """Get all import jobs for a project, newest first."""
        stmt = (
            select(ImportJob)
            .where(ImportJob.project_id == project_id)
            .order_by(desc(ImportJob.created_at))
        )
        return list(self.db.scalars(stmt).all())

    def get_latest_for_project(self, project_id: int) -> Optional[ImportJob]:
        """Get the most recent import job for a project."""
        stmt = (
            select(ImportJob)
            .where(ImportJob.project_id == project_id)
            .order_by(desc(ImportJob.created_at))
            .limit(1)
        )
        return self.db.scalars(stmt).first()

    def get_by_celery_task_id(self, celery_task_id: str) -> Optional[ImportJob]:
        """Get an import job by its Celery task ID."""
        stmt = select(ImportJob).where(ImportJob.celery_task_id == celery_task_id)
        return self.db.scalars(stmt).first()
