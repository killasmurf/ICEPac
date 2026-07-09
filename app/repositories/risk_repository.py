"""Risk repository."""
from decimal import Decimal
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.database.risk import Risk
from app.models.database.wbs import WBS
from app.repositories.base import BaseRepository


class RiskRepository(BaseRepository[Risk]):
    """Repository for Risk operations.

    A Risk is scoped to either a WBS item (legacy WBS-scoped risks,
    parent.wbs_id is set) OR a Project (project-level risks, parent.project_id
    is set). The XOR invariant is enforced at the DB layer
    (ck_risk_xor_parent) but routing logic relies on these helpers filtering
    by the right parent column to keep the scopes distinct.
    """

    def __init__(self, db: Session):
        super().__init__(Risk, db)

    def get_by_wbs(self, wbs_id: int) -> List[Risk]:
        """Get WBS-scoped risks for a single WBS item."""
        stmt = (
            select(Risk)
            .where(Risk.wbs_id == wbs_id)
            .order_by(Risk.date_identified.desc())
        )
        return list(self.db.scalars(stmt).all())

    def count_by_wbs(self, wbs_id: int) -> int:
        """Count WBS-scoped risks for a single WBS item."""
        stmt = select(func.count()).select_from(Risk).where(Risk.wbs_id == wbs_id)
        return self.db.scalar(stmt) or 0

    def get_all_wbs_scoped_by_project(self, project_id: int) -> List[Risk]:
        """Get ALL WBS-scoped risks under a project (joined through WBS).

        Used by the dashboard to render a project's full risk picture.
        Distinct from the project-level risks register at
        /projects/{id}/risks (see get_by_project below).
        """
        stmt = (
            select(Risk)
            .join(WBS, Risk.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
            .order_by(WBS.id, Risk.date_identified.desc())
        )
        return list(self.db.scalars(stmt).all())

    def count_all_wbs_scoped_by_project(self, project_id: int) -> int:
        """Count all WBS-scoped risks under a project."""
        stmt = (
            select(func.count())
            .select_from(Risk)
            .join(WBS, Risk.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
        )
        return self.db.scalar(stmt) or 0

    # ---- Project-level (cross-cutting) risks ----

    def get_by_project(self, project_id: int) -> List[Risk]:
        """Get project-level risks for a project (excludes WBS-scoped).

        Filters on project_id={id} AND wbs_id IS NULL so it never
        accidentally returns WBS-scoped risks.
        """
        stmt = (
            select(Risk)
            .where(Risk.project_id == project_id, Risk.wbs_id.is_(None))
            .order_by(Risk.date_identified.desc(), Risk.id.asc())
        )
        return list(self.db.scalars(stmt).all())

    def count_by_project(self, project_id: int) -> int:
        """Count project-level risks for a project."""
        stmt = (
            select(func.count())
            .select_from(Risk)
            .where(Risk.project_id == project_id, Risk.wbs_id.is_(None))
        )
        return self.db.scalar(stmt) or 0

    def get_total_cost_by_wbs(self, wbs_id: int) -> float:
        """Get sum of risk_cost for a WBS item (WBS-scoped)."""
        stmt = select(func.sum(Risk.risk_cost)).where(Risk.wbs_id == wbs_id)
        return float(self.db.scalar(stmt) or 0)

    def get_total_cost_by_project(self, project_id: int) -> float:
        """Get sum of risk_cost for project-level risks under a project.

        Sums project-level risks only (wbs_id IS NULL). For the aggregate
        of ALL risks under a project (WBS + project-level), the route layer
        adds the WBS-scoped sums from each WBS item.
        """
        stmt = select(func.coalesce(func.sum(Risk.risk_cost), 0)).where(
            Risk.project_id == project_id, Risk.wbs_id.is_(None)
        )
        result = self.db.scalar(stmt)
        return float(Decimal(str(result)))
