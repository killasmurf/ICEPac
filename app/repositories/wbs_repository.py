"""WBS repository."""
from typing import List, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.database.wbs import WBS
from app.repositories.base import BaseRepository


class WBSRepository(BaseRepository[WBS]):
    """Repository for WBS operations with hierarchy support."""

    def __init__(self, db: Session):
        super().__init__(WBS, db)

    def get_by_project(
        self, project_id: int, skip: int = 0, limit: int = 1000
    ) -> List[WBS]:
        """Get all WBS items for a project, ordered by outline level and ID."""
        stmt = (
            select(WBS)
            .where(WBS.project_id == project_id)
            .order_by(WBS.outline_level, WBS.id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_project(self, project_id: int) -> int:
        """Count WBS items for a project."""
        stmt = select(func.count()).select_from(WBS).where(WBS.project_id == project_id)
        return self.db.scalar(stmt) or 0

    def get_root_items(self, project_id: int) -> List[WBS]:
        """Get top-level WBS items (no parent) for a project."""
        stmt = (
            select(WBS)
            .where(WBS.project_id == project_id, WBS.parent_id.is_(None))
            .order_by(WBS.id)
        )
        return list(self.db.scalars(stmt).all())

    def get_children(self, parent_id: int) -> List[WBS]:
        """Get direct children of a WBS item."""
        stmt = select(WBS).where(WBS.parent_id == parent_id).order_by(WBS.id)
        return list(self.db.scalars(stmt).all())

    def get_by_unique_id(self, project_id: int, task_unique_id: int) -> Optional[WBS]:
        """Get a WBS item by its MS Project unique ID within a project."""
        stmt = select(WBS).where(
            WBS.project_id == project_id,
            WBS.task_unique_id == task_unique_id,
        )
        return self.db.scalars(stmt).first()

    def delete_by_project(self, project_id: int) -> int:
        """Delete all WBS items for a project. Returns count deleted."""
        count = self.count_by_project(project_id)
        stmt = delete(WBS).where(WBS.project_id == project_id)
        self.db.execute(stmt)
        self.db.commit()
        return count

    def bulk_create(self, items: List[dict]) -> List[WBS]:
        """Create multiple WBS items in a single transaction."""
        db_items = [WBS(**data) for data in items]
        self.db.add_all(db_items)
        self.db.commit()
        for item in db_items:
            self.db.refresh(item)
        return db_items
