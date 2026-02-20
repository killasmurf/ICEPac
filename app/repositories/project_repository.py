"""Project and WBS repositories."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.database.project import Project
from app.models.database.wbs import WBS
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """Repository for Project CRUD operations."""

    def __init__(self, db: Session):
        super().__init__(Project, db)

    def get_with_wbs(self, project_id: int) -> Optional[Project]:
        """Load a project together with its WBS items."""
        stmt = (
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.wbs_items))
        )
        return self.db.scalar(stmt)

    def get_multi_active(self, skip: int = 0, limit: int = 100) -> List[Project]:
        """Return only non-archived projects."""
        stmt = (
            select(Project)
            .where(Project.archived == False)  # noqa: E712
            .offset(skip)
            .limit(limit)
            .order_by(Project.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def count_active(self) -> int:
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(Project)
            .where(Project.archived == False)  # noqa: E712
        )
        return self.db.scalar(stmt) or 0

    def get_by_name(self, name: str) -> Optional[Project]:
        stmt = select(Project).where(Project.project_name == name)
        return self.db.scalar(stmt)


class WBSRepository(BaseRepository[WBS]):
    """Repository for WBS CRUD operations."""

    def __init__(self, db: Session):
        super().__init__(WBS, db)

    def get_by_project(self, project_id: int, skip: int = 0, limit: int = 500) -> List[WBS]:
        """Return all WBS items for a project."""
        stmt = (
            select(WBS)
            .where(WBS.project_id == project_id)
            .offset(skip)
            .limit(limit)
            .order_by(WBS.wbs_code)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_project(self, project_id: int) -> int:
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(WBS)
            .where(WBS.project_id == project_id)
        )
        return self.db.scalar(stmt) or 0

    def get_by_task_id(self, project_id: int, task_unique_id: int) -> Optional[WBS]:
        stmt = (
            select(WBS)
            .where(WBS.project_id == project_id, WBS.task_unique_id == task_unique_id)
        )
        return self.db.scalar(stmt)

    def bulk_create(self, items: List[dict]) -> List[WBS]:
        """Insert multiple WBS rows in one transaction."""
        db_items = [WBS(**item) for item in items]
        self.db.add_all(db_items)
        self.db.commit()
        for obj in db_items:
            self.db.refresh(obj)
        return db_items
