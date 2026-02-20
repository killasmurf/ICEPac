"""Resource Assignment repository."""
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.database.assignment import ResourceAssignment
from app.models.database.wbs import WBS
from app.repositories.base import BaseRepository


class AssignmentRepository(BaseRepository[ResourceAssignment]):
    """Repository for ResourceAssignment operations."""

    def __init__(self, db: Session):
        super().__init__(ResourceAssignment, db)

    def get_by_wbs(self, wbs_id: int) -> List[ResourceAssignment]:
        """Get all assignments for a WBS item."""
        stmt = (
            select(ResourceAssignment)
            .where(ResourceAssignment.wbs_id == wbs_id)
            .order_by(ResourceAssignment.id)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_wbs(self, wbs_id: int) -> int:
        """Count assignments for a WBS item."""
        stmt = (
            select(func.count())
            .select_from(ResourceAssignment)
            .where(ResourceAssignment.wbs_id == wbs_id)
        )
        return self.db.scalar(stmt) or 0

    def get_by_project(self, project_id: int) -> List[ResourceAssignment]:
        """Get all assignments for a project (through WBS join)."""
        stmt = (
            select(ResourceAssignment)
            .join(WBS, ResourceAssignment.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
            .order_by(WBS.id, ResourceAssignment.id)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_project(self, project_id: int) -> int:
        """Count assignments for a project."""
        stmt = (
            select(func.count())
            .select_from(ResourceAssignment)
            .join(WBS, ResourceAssignment.wbs_id == WBS.id)
            .where(WBS.project_id == project_id)
        )
        return self.db.scalar(stmt) or 0

    def get_pert_sum_by_wbs(self, wbs_id: int) -> dict:
        """Get PERT-related sums for a WBS item.

        Returns dict with:
        - total_pert: Sum of (best + 4*likely + worst) / 6
        - total_variance: Sum of ((worst - best) / 6)^2
        - count: Number of assignments
        """
        assignments = self.get_by_wbs(wbs_id)
        total_pert = 0.0
        total_variance = 0.0

        for a in assignments:
            total_pert += a.pert_estimate
            total_variance += a.std_deviation**2

        return {
            "total_pert": total_pert,
            "total_variance": total_variance,
            "count": len(assignments),
        }

    def get_summary_by_field(self, project_id: int, group_field: str) -> List[dict]:
        """Group assignment PERT totals by a code field.

        Args:
            project_id: Project ID
            group_field: Column name to group by (e.g., 'cost_type_code', 'region_code')

        Returns:
            List of dicts with code, total_pert, count
        """
        if group_field not in (
            "cost_type_code",
            "region_code",
            "bus_area_code",
            "resource_code",
            "supplier_code",
            "estimating_technique_code",
        ):
            raise ValueError(f"Invalid group field: {group_field}")

        # Get assignments for project
        assignments = self.get_by_project(project_id)

        # Group in memory (simpler than complex SQL for PERT calculation)
        groups = {}
        for a in assignments:
            code = getattr(a, group_field) or "UNASSIGNED"
            if code not in groups:
                groups[code] = {"code": code, "total_pert": 0.0, "count": 0}
            groups[code]["total_pert"] += a.pert_estimate
            groups[code]["count"] += 1

        return list(groups.values())
