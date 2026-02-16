"""Estimation service - core cost estimation engine."""
import math
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.database.wbs import WBS
from app.models.database.project import Project
from app.models.database.config_tables import (
    CostType,
    Region,
    BusinessArea,
)
from app.models.database.resource import Supplier
from app.models.schemas.estimation import (
    WBSCostSummary,
    ProjectEstimationSummary,
    CostBreakdownItem,
    SupplierBreakdownItem,
)
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.risk_repository import RiskRepository
from app.repositories.wbs_repository import WBSRepository
from app.repositories.project_repository import ProjectRepository
from app.services.risk_service import RiskService


class EstimationService:
    """Service for computing project cost estimates."""

    # Z-score for 80% confidence interval
    Z_80 = 1.28

    def __init__(self, db: Session):
        self.db = db
        self.assignment_repo = AssignmentRepository(db)
        self.risk_repo = RiskRepository(db)
        self.wbs_repo = WBSRepository(db)
        self.project_repo = ProjectRepository(db)
        self.risk_service = RiskService(db)

    def get_wbs_cost_summary(self, wbs_id: int) -> WBSCostSummary:
        """Compute cost summary for a single WBS item.

        Includes:
        - Sum of PERT estimates from assignments
        - Combined standard deviation
        - 80% confidence interval
        - Sum of risk exposures
        - Risk-adjusted estimate
        """
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS item not found",
            )

        # Get assignments and compute totals
        assignments = self.assignment_repo.get_by_wbs(wbs_id)
        total_pert = sum(a.pert_estimate for a in assignments)
        variances = [a.std_deviation ** 2 for a in assignments]
        total_std = math.sqrt(sum(variances)) if variances else 0.0

        # Compute confidence interval
        ci_low, ci_high = self._compute_confidence_interval(total_pert, total_std)

        # Get risks and compute exposure
        risks = self.risk_repo.get_by_wbs(wbs_id)
        total_exposure = sum(
            self.risk_service.compute_risk_exposure(r) for r in risks
        )

        return WBSCostSummary(
            wbs_id=wbs.id,
            wbs_code=wbs.wbs_code,
            wbs_title=wbs.wbs_title,
            assignment_count=len(assignments),
            total_pert_estimate=total_pert,
            total_std_deviation=total_std,
            confidence_80_low=ci_low,
            confidence_80_high=ci_high,
            risk_count=len(risks),
            total_risk_exposure=total_exposure,
            risk_adjusted_estimate=total_pert + total_exposure,
            approval_status=wbs.approval_status,
        )

    def get_project_estimation(self, project_id: int) -> ProjectEstimationSummary:
        """Compute full project cost estimation with breakdowns.

        Includes:
        - Total PERT estimate across all WBS items
        - Combined standard deviation
        - 80% confidence interval
        - Total risk exposure
        - Risk-adjusted estimate
        - Breakdowns by cost type, region, resource, supplier
        """
        project = self.project_repo.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Get all WBS items
        wbs_items = self.wbs_repo.get_by_project(project_id, skip=0, limit=10000)

        # Get all assignments and risks
        assignments = self.assignment_repo.get_by_project(project_id)
        risks = self.risk_repo.get_by_project(project_id)

        # Compute totals
        total_pert = sum(a.pert_estimate for a in assignments)
        variances = [a.std_deviation ** 2 for a in assignments]
        total_std = math.sqrt(sum(variances)) if variances else 0.0
        ci_low, ci_high = self._compute_confidence_interval(total_pert, total_std)

        # Compute total risk exposure
        total_exposure = sum(
            self.risk_service.compute_risk_exposure(r) for r in risks
        )

        # Compute breakdowns
        by_cost_type = self._compute_cost_type_breakdown(assignments)
        by_region = self._compute_region_breakdown(assignments)
        by_resource = self._compute_resource_breakdown(assignments)
        by_supplier = self._compute_supplier_breakdown(assignments)

        # Compute WBS-level summaries
        wbs_summaries = []
        for wbs in wbs_items:
            wbs_assignments = [a for a in assignments if a.wbs_id == wbs.id]
            wbs_risks = [r for r in risks if r.wbs_id == wbs.id]

            wbs_pert = sum(a.pert_estimate for a in wbs_assignments)
            wbs_variances = [a.std_deviation ** 2 for a in wbs_assignments]
            wbs_std = math.sqrt(sum(wbs_variances)) if wbs_variances else 0.0
            wbs_ci_low, wbs_ci_high = self._compute_confidence_interval(wbs_pert, wbs_std)
            wbs_exposure = sum(
                self.risk_service.compute_risk_exposure(r) for r in wbs_risks
            )

            wbs_summaries.append(
                WBSCostSummary(
                    wbs_id=wbs.id,
                    wbs_code=wbs.wbs_code,
                    wbs_title=wbs.wbs_title,
                    assignment_count=len(wbs_assignments),
                    total_pert_estimate=wbs_pert,
                    total_std_deviation=wbs_std,
                    confidence_80_low=wbs_ci_low,
                    confidence_80_high=wbs_ci_high,
                    risk_count=len(wbs_risks),
                    total_risk_exposure=wbs_exposure,
                    risk_adjusted_estimate=wbs_pert + wbs_exposure,
                    approval_status=wbs.approval_status,
                )
            )

        return ProjectEstimationSummary(
            project_id=project.id,
            project_name=project.project_name,
            total_wbs_items=len(wbs_items),
            total_assignments=len(assignments),
            total_pert_estimate=total_pert,
            total_std_deviation=total_std,
            confidence_80_low=ci_low,
            confidence_80_high=ci_high,
            total_risks=len(risks),
            total_risk_exposure=total_exposure,
            risk_adjusted_estimate=total_pert + total_exposure,
            by_cost_type=by_cost_type,
            by_region=by_region,
            by_resource=by_resource,
            by_supplier=by_supplier,
            wbs_summaries=wbs_summaries,
        )

    def _compute_confidence_interval(
        self, pert_total: float, std_dev: float
    ) -> tuple[float, float]:
        """Compute 80% confidence interval.

        Using Central Limit Theorem:
        - Low = PERT - z * std_dev
        - High = PERT + z * std_dev

        Where z = 1.28 for 80% confidence.
        """
        margin = self.Z_80 * std_dev
        return (pert_total - margin, pert_total + margin)

    def _compute_cost_type_breakdown(
        self, assignments: list
    ) -> List[CostBreakdownItem]:
        """Group assignments by cost type and sum PERT."""
        groups = {}
        for a in assignments:
            code = a.cost_type_code or "UNASSIGNED"
            if code not in groups:
                groups[code] = {"code": code, "total_pert": 0.0, "count": 0}
            groups[code]["total_pert"] += a.pert_estimate
            groups[code]["count"] += 1

        # Lookup descriptions
        result = []
        for code, data in groups.items():
            if code != "UNASSIGNED":
                stmt = select(CostType).where(CostType.code == code)
                ct = self.db.scalars(stmt).first()
                desc = ct.description if ct else code
            else:
                desc = "Unassigned"
            result.append(
                CostBreakdownItem(
                    code=code,
                    description=desc,
                    total_pert=data["total_pert"],
                    assignment_count=data["count"],
                )
            )
        return sorted(result, key=lambda x: x.total_pert, reverse=True)

    def _compute_region_breakdown(
        self, assignments: list
    ) -> List[CostBreakdownItem]:
        """Group assignments by region and sum PERT."""
        groups = {}
        for a in assignments:
            code = a.region_code or "UNASSIGNED"
            if code not in groups:
                groups[code] = {"code": code, "total_pert": 0.0, "count": 0}
            groups[code]["total_pert"] += a.pert_estimate
            groups[code]["count"] += 1

        result = []
        for code, data in groups.items():
            if code != "UNASSIGNED":
                stmt = select(Region).where(Region.code == code)
                r = self.db.scalars(stmt).first()
                desc = r.description if r else code
            else:
                desc = "Unassigned"
            result.append(
                CostBreakdownItem(
                    code=code,
                    description=desc,
                    total_pert=data["total_pert"],
                    assignment_count=data["count"],
                )
            )
        return sorted(result, key=lambda x: x.total_pert, reverse=True)

    def _compute_resource_breakdown(
        self, assignments: list
    ) -> List[CostBreakdownItem]:
        """Group assignments by resource and sum PERT."""
        groups = {}
        for a in assignments:
            code = a.resource_code
            if code not in groups:
                groups[code] = {"code": code, "total_pert": 0.0, "count": 0}
            groups[code]["total_pert"] += a.pert_estimate
            groups[code]["count"] += 1

        result = []
        from app.models.database.resource import Resource

        for code, data in groups.items():
            stmt = select(Resource).where(Resource.resource_code == code)
            r = self.db.scalars(stmt).first()
            desc = r.description if r else code
            result.append(
                CostBreakdownItem(
                    code=code,
                    description=desc,
                    total_pert=data["total_pert"],
                    assignment_count=data["count"],
                )
            )
        return sorted(result, key=lambda x: x.total_pert, reverse=True)

    def _compute_supplier_breakdown(
        self, assignments: list
    ) -> List[SupplierBreakdownItem]:
        """Group assignments by supplier and sum PERT."""
        groups = {}
        for a in assignments:
            code = a.supplier_code or "UNASSIGNED"
            if code not in groups:
                groups[code] = {"code": code, "total_pert": 0.0, "count": 0}
            groups[code]["total_pert"] += a.pert_estimate
            groups[code]["count"] += 1

        result = []
        from app.models.database.resource import Supplier

        for code, data in groups.items():
            if code != "UNASSIGNED":
                stmt = select(Supplier).where(Supplier.supplier_code == code)
                s = self.db.scalars(stmt).first()
                name = s.name if s else code
            else:
                name = "Unassigned"
            result.append(
                SupplierBreakdownItem(
                    code=code,
                    name=name,
                    total_pert=data["total_pert"],
                    assignment_count=data["count"],
                )
            )
        return sorted(result, key=lambda x: x.total_pert, reverse=True)
