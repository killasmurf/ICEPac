"""Risk service."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database.config_tables import ProbabilityLevel, SeverityLevel
from app.models.database.risk import Risk
from app.models.database.wbs import WBS
from app.models.schemas.risk import (
    ProjectRiskCreate,
    ProjectRiskUpdate,
    RiskCreate,
    RiskUpdate,
)
from app.repositories.risk_repository import RiskRepository
from app.repositories.wbs_repository import WBSRepository


class RiskService:
    """Service for managing risks — both WBS-scoped (legacy) and
    project-scoped (the cross-cutting risk register)."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = RiskRepository(db)
        self.wbs_repo = WBSRepository(db)

    def get(self, risk_id: int) -> Optional[Risk]:
        """Get a risk by ID."""
        return self.repository.get(risk_id)

    def get_or_404(self, risk_id: int) -> Risk:
        """Get a risk by ID or raise 404."""
        risk = self.repository.get(risk_id)
        if not risk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Risk not found",
            )
        return risk

    def get_by_wbs(self, wbs_id: int) -> List[Risk]:
        """Get WBS-scoped risks for a single WBS item."""
        return self.repository.get_by_wbs(wbs_id)

    def count_by_wbs(self, wbs_id: int) -> int:
        """Count WBS-scoped risks for a single WBS item."""
        return self.repository.count_by_wbs(wbs_id)

    def create(self, wbs_id: int, data: RiskCreate) -> Risk:
        """Create a new WBS-scoped risk.

        Validates:
        - WBS item exists
        - WBS item is editable (not submitted/approved)
        """
        # Validate WBS exists and is editable
        self._validate_wbs_editable(wbs_id)

        # Create risk
        risk_data = data.model_dump()
        risk_data["wbs_id"] = wbs_id
        risk_data["project_id"] = None  # XOR: WBS-scoped risks have no project_id
        return self.repository.create(risk_data)

    def update(self, risk_id: int, data: RiskUpdate) -> Risk:
        """Update a WBS-scoped risk.

        Validates:
        - Risk exists
        - WBS item is editable (not submitted/approved)
        """
        risk = self.get_or_404(risk_id)
        if risk.wbs_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS-scoped risk not found",
            )

        # Validate WBS is editable
        self._validate_wbs_editable(risk.wbs_id)

        update_data = data.model_dump(exclude_unset=True)
        # Refuse attempts to flip wbs_id / project_id via update
        update_data.pop("wbs_id", None)
        update_data.pop("project_id", None)
        return self.repository.update(risk, update_data)

    def delete(self, risk_id: int) -> bool:
        """Delete a WBS-scoped risk.

        Validates WBS is editable before allowing delete.
        """
        risk = self.get_or_404(risk_id)
        if risk.wbs_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS-scoped risk not found",
            )

        # Validate WBS is editable
        self._validate_wbs_editable(risk.wbs_id)

        return self.repository.delete(risk_id)

    # ---- Project-scoped (cross-cutting) risks ----

    def get_by_project(self, project_id: int) -> List[Risk]:
        """Get project-level risks (excludes WBS-scoped)."""
        return self.repository.get_by_project(project_id)

    def count_by_project(self, project_id: int) -> int:
        """Count project-level risks."""
        return self.repository.count_by_project(project_id)

    def get_total_cost_by_project(self, project_id: int) -> float:
        """Sum of risk_cost for project-level risks (WBS-scoped excluded)."""
        return self.repository.get_total_cost_by_project(project_id)

    def create_for_project(self, project_id: int, data: ProjectRiskCreate) -> Risk:
        """Create a project-level risk. Sets project_id, leaves wbs_id NULL."""
        risk_data = data.model_dump()
        risk_data["project_id"] = project_id
        risk_data["wbs_id"] = None  # XOR: project-scoped risks have no wbs_id
        return self.repository.create(risk_data)

    def update_project_risk(self, risk_id: int, data: ProjectRiskUpdate) -> Risk:
        """Update a project-scoped risk. Verifies scope before mutating."""
        risk = self.get_or_404(risk_id)
        if risk.project_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project-scoped risk not found",
            )
        update_data = data.model_dump(exclude_unset=True)
        # Refuse attempts to flip project_id / wbs_id (locked to URL scope)
        update_data.pop("project_id", None)
        update_data.pop("wbs_id", None)
        return self.repository.update(risk, update_data)

    def delete_project_risk(self, risk_id: int) -> bool:
        """Delete a project-scoped risk. Verifies scope before deleting."""
        risk = self.get_or_404(risk_id)
        if risk.project_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project-scoped risk not found",
            )
        return self.repository.delete(risk_id)

    def compute_risk_exposure(self, risk: Risk) -> float:
        """Compute risk exposure: risk_cost * probability_weight * severity_weight.

        Returns 0.0 if probability or severity codes are not set or not found.
        """
        if not risk.probability_code or not risk.severity_code:
            return 0.0

        # Get probability weight
        prob_stmt = select(ProbabilityLevel).where(
            ProbabilityLevel.code == risk.probability_code
        )
        probability = self.db.scalars(prob_stmt).first()
        prob_weight = float(probability.weight) if probability else 0.0

        # Get severity weight
        sev_stmt = select(SeverityLevel).where(SeverityLevel.code == risk.severity_code)
        severity = self.db.scalars(sev_stmt).first()
        sev_weight = float(severity.weight) if severity else 0.0

        # Compute exposure
        risk_cost = float(risk.risk_cost or 0)
        return risk_cost * prob_weight * sev_weight

    def get_with_exposure(self, risk_id: int) -> dict:
        """Get a risk with computed exposure included."""
        risk = self.get_or_404(risk_id)
        exposure = self.compute_risk_exposure(risk)
        return {
            "risk": risk,
            "risk_exposure": exposure,
        }

    def get_by_wbs_with_exposure(self, wbs_id: int) -> List[dict]:
        """Get all risks for a WBS item with computed exposure."""
        risks = self.get_by_wbs(wbs_id)
        return [
            {
                "risk": risk,
                "risk_exposure": self.compute_risk_exposure(risk),
            }
            for risk in risks
        ]

    def get_total_exposure_by_wbs(self, wbs_id: int) -> float:
        """Get total risk exposure for a WBS item."""
        risks = self.get_by_wbs(wbs_id)
        return sum(self.compute_risk_exposure(r) for r in risks)

    def _validate_wbs_editable(self, wbs_id: int) -> WBS:
        """Validate that a WBS item exists and is editable.

        Raises:
            HTTPException 404 if WBS not found
            HTTPException 409 if WBS is submitted or approved
        """
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS item not found",
            )

        if wbs.approval_status in ("submitted", "approved"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot modify risk: WBS item is {wbs.approval_status}",
            )

        return wbs
