"""Risk service."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.database.risk import Risk
from app.models.database.wbs import WBS
from app.models.database.config_tables import ProbabilityLevel, SeverityLevel
from app.models.schemas.risk import RiskCreate, RiskUpdate, RiskResponse
from app.repositories.risk_repository import RiskRepository
from app.repositories.wbs_repository import WBSRepository


class RiskService:
    """Service for managing risks."""

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
        """Get all risks for a WBS item."""
        return self.repository.get_by_wbs(wbs_id)

    def count_by_wbs(self, wbs_id: int) -> int:
        """Count risks for a WBS item."""
        return self.repository.count_by_wbs(wbs_id)

    def create(self, wbs_id: int, data: RiskCreate) -> Risk:
        """Create a new risk for a WBS item.

        Validates:
        - WBS item exists
        - WBS item is editable (not submitted/approved)
        """
        # Validate WBS exists and is editable
        self._validate_wbs_editable(wbs_id)

        # Create risk
        risk_data = data.model_dump()
        risk_data["wbs_id"] = wbs_id
        return self.repository.create(risk_data)

    def update(self, risk_id: int, data: RiskUpdate) -> Risk:
        """Update a risk.

        Validates:
        - Risk exists
        - WBS item is editable (not submitted/approved)
        """
        risk = self.get_or_404(risk_id)

        # Validate WBS is editable
        self._validate_wbs_editable(risk.wbs_id)

        update_data = data.model_dump(exclude_unset=True)
        return self.repository.update(risk, update_data)

    def delete(self, risk_id: int) -> bool:
        """Delete a risk.

        Validates WBS is editable before allowing delete.
        """
        risk = self.get_or_404(risk_id)

        # Validate WBS is editable
        self._validate_wbs_editable(risk.wbs_id)

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
        sev_stmt = select(SeverityLevel).where(
            SeverityLevel.code == risk.severity_code
        )
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
