"""Risk repository."""
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.database.risk import Risk
from app.models.database.wbs import WBS
from app.repositories.base import BaseRepository


class RiskRepository(BaseRepository[Risk]):
    """Repository for Risk operations."""

    def __init__(self, db: Session):
        super().__init__(Risk, db)

    def get_by_wbs(self, wbs_id: int) -> List[Risk]:
        """Get all risks for a WBS item."""
        stmt = (
            select(Risk)
            .where(Risk.wbs_id == wbs_id)
            .order_by(Risk.date_identified.desc())
        )
        return list(self.db.scalars(stmt).all())

    def count_by_wbs(self, wbs_id: int) -> int:
        """Count risks for a WBS item."""
        stmt = select(func.count()).select_from(Risk).where(Risk.wbs_id == wbs_id)
        return self.db.scalar(stmt) or 0

    def get_by_project(self, project_id: int) -> List[Risk]:
        """Get all risks for a project (through WBS join)."""
        stmt = (
            select(Risk)
            .join(WBS, Risk.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
            .order_by(WBS.id, Risk.date_identified.desc())
        )
        return list(self.db.scalars(stmt).all())

    def count_by_project(self, project_id: int) -> int:
        """Count risks for a project."""
        stmt = (
            select(func.count())
            .select_from(Risk)
            .join(WBS, Risk.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
        )
        return self.db.scalar(stmt) or 0

    def get_total_cost_by_wbs(self, wbs_id: int) -> float:
        """Get sum of risk_cost for a WBS item."""
        stmt = select(func.sum(Risk.risk_cost)).where(Risk.wbs_id == wbs_id)
        return float(self.db.scalar(stmt) or 0)

    def get_total_cost_by_project(self, project_id: int) -> float:
        """Get sum of risk_cost for a project."""
        stmt = (
            select(func.sum(Risk.risk_cost))
            .select_from(Risk)
            .join(WBS, Risk.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
        )
        return float(self.db.scalar(stmt) or 0)
