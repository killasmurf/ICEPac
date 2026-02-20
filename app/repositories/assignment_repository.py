"""Repositories for ResourceAssignment and Risk."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database.assignment import ResourceAssignment
from app.models.database.risk import Risk
from app.repositories.base import BaseRepository


class AssignmentRepository(BaseRepository[ResourceAssignment]):
    """CRUD for resource assignments on a WBS item."""

    def __init__(self, db: Session):
        super().__init__(ResourceAssignment, db)

    def get_by_wbs(self, wbs_id: int) -> List[ResourceAssignment]:
        stmt = (
            select(ResourceAssignment)
            .where(ResourceAssignment.wbs_id == wbs_id)
            .order_by(ResourceAssignment.id)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_wbs(self, wbs_id: int) -> int:
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(ResourceAssignment)
            .where(ResourceAssignment.wbs_id == wbs_id)
        )
        return self.db.scalar(stmt) or 0

    def get_by_wbs_and_resource(
        self, wbs_id: int, resource_code: str
    ) -> Optional[ResourceAssignment]:
        stmt = select(ResourceAssignment).where(
            ResourceAssignment.wbs_id == wbs_id,
            ResourceAssignment.resource_code == resource_code,
        )
        return self.db.scalar(stmt)


class RiskRepository(BaseRepository[Risk]):
    """CRUD for risks on a WBS item."""

    def __init__(self, db: Session):
        super().__init__(Risk, db)

    def get_by_wbs(self, wbs_id: int) -> List[Risk]:
        stmt = (
            select(Risk)
            .where(Risk.wbs_id == wbs_id)
            .order_by(Risk.id)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_wbs(self, wbs_id: int) -> int:
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(Risk)
            .where(Risk.wbs_id == wbs_id)
        )
        return self.db.scalar(stmt) or 0
