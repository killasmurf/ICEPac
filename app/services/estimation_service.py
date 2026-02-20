"""Estimation service: resource assignments, risks, and PERT summaries."""
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.assignment import ResourceAssignment
from app.models.database.risk import Risk
from app.models.schemas.estimation import (
    AssignmentCreate, AssignmentUpdate,
    ProjectEstimateSummary, RiskCreate, RiskUpdate, WBSEstimateSummary,
)
from app.repositories.assignment_repository import AssignmentRepository, RiskRepository
from app.repositories.project_repository import ProjectRepository, WBSRepository


class EstimationService:
    def __init__(self, db: Session):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.wbs_repo = WBSRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.risk_repo = RiskRepository(db)

    # ------------------------------------------------------------------
    # Guard helpers
    # ------------------------------------------------------------------

    def _require_project(self, project_id: int):
        if not self.project_repo.get(project_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    def _require_wbs(self, project_id: int, wbs_id: int):
        self._require_project(project_id)
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs or wbs.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WBS item not found")
        return wbs

    def _require_assignment(self, wbs_id: int, assignment_id: int) -> ResourceAssignment:
        a = self.assignment_repo.get(assignment_id)
        if not a or a.wbs_id != wbs_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
        return a

    def _require_risk(self, wbs_id: int, risk_id: int) -> Risk:
        r = self.risk_repo.get(risk_id)
        if not r or r.wbs_id != wbs_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found")
        return r

    # ------------------------------------------------------------------
    # Assignments
    # ------------------------------------------------------------------

    def list_assignments(self, project_id: int, wbs_id: int) -> List[ResourceAssignment]:
        self._require_wbs(project_id, wbs_id)
        return self.assignment_repo.get_by_wbs(wbs_id)

    def create_assignment(
        self, project_id: int, wbs_id: int, data: AssignmentCreate
    ) -> ResourceAssignment:
        self._require_wbs(project_id, wbs_id)
        row = data.model_dump()
        row["wbs_id"] = wbs_id
        return self.assignment_repo.create(row)

    def update_assignment(
        self, project_id: int, wbs_id: int, assignment_id: int, data: AssignmentUpdate
    ) -> ResourceAssignment:
        self._require_wbs(project_id, wbs_id)
        assignment = self._require_assignment(wbs_id, assignment_id)
        return self.assignment_repo.update(assignment, data.model_dump(exclude_unset=True))

    def delete_assignment(self, project_id: int, wbs_id: int, assignment_id: int) -> None:
        self._require_wbs(project_id, wbs_id)
        self._require_assignment(wbs_id, assignment_id)
        self.assignment_repo.delete(assignment_id)

    # ------------------------------------------------------------------
    # Risks
    # ------------------------------------------------------------------

    def list_risks(self, project_id: int, wbs_id: int) -> List[Risk]:
        self._require_wbs(project_id, wbs_id)
        return self.risk_repo.get_by_wbs(wbs_id)

    def create_risk(self, project_id: int, wbs_id: int, data: RiskCreate) -> Risk:
        self._require_wbs(project_id, wbs_id)
        row = data.model_dump()
        row["wbs_id"] = wbs_id
        if row.get("date_identified") is None:
            from datetime import datetime
            row["date_identified"] = datetime.utcnow()
        return self.risk_repo.create(row)

    def update_risk(
        self, project_id: int, wbs_id: int, risk_id: int, data: RiskUpdate
    ) -> Risk:
        self._require_wbs(project_id, wbs_id)
        risk = self._require_risk(wbs_id, risk_id)
        return self.risk_repo.update(risk, data.model_dump(exclude_unset=True))

    def delete_risk(self, project_id: int, wbs_id: int, risk_id: int) -> None:
        self._require_wbs(project_id, wbs_id)
        self._require_risk(wbs_id, risk_id)
        self.risk_repo.delete(risk_id)

    # ------------------------------------------------------------------
    # Project-level estimate summary (PERT roll-up)
    # ------------------------------------------------------------------

    def project_estimate_summary(self, project_id: int) -> ProjectEstimateSummary:
        project = self.project_repo.get(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        wbs_items = self.wbs_repo.get_by_project(project_id, limit=10_000)

        total_best = Decimal("0")
        total_likely = Decimal("0")
        total_worst = Decimal("0")
        total_pert = 0.0
        total_std_dev = 0.0
        total_risk_cost = Decimal("0")
        wbs_summaries: List[WBSEstimateSummary] = []

        for wbs in wbs_items:
            assignments = self.assignment_repo.get_by_wbs(wbs.id)
            risks = self.risk_repo.get_by_wbs(wbs.id)

            wb_best = sum((a.best_estimate or Decimal("0")) for a in assignments)
            wb_likely = sum((a.likely_estimate or Decimal("0")) for a in assignments)
            wb_worst = sum((a.worst_estimate or Decimal("0")) for a in assignments)
            wb_pert = sum(a.pert_estimate for a in assignments)
            wb_std = sum(a.std_deviation for a in assignments)
            wb_risk = sum((r.risk_cost or Decimal("0")) for r in risks)

            wbs_summaries.append(WBSEstimateSummary(
                wbs_id=wbs.id,
                wbs_title=wbs.wbs_title,
                wbs_code=wbs.wbs_code,
                assignment_count=len(assignments),
                total_best=wb_best,
                total_likely=wb_likely,
                total_worst=wb_worst,
                total_pert=wb_pert,
                total_std_deviation=wb_std,
                risk_count=len(risks),
                total_risk_cost=wb_risk,
            ))

            total_best += wb_best
            total_likely += wb_likely
            total_worst += wb_worst
            total_pert += wb_pert
            total_std_dev += wb_std
            total_risk_cost += wb_risk

        return ProjectEstimateSummary(
            project_id=project.id,
            project_name=project.project_name,
            wbs_count=len(wbs_items),
            total_best=total_best,
            total_likely=total_likely,
            total_worst=total_worst,
            total_pert=total_pert,
            total_std_deviation=total_std_dev,
            total_risk_cost=total_risk_cost,
            wbs_summaries=wbs_summaries,
        )
