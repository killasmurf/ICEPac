"""Risk routes — project-scoped (cross-cutting risk register).

The WBS-scoped risk CRUD (`/projects/{id}/wbs/{id}/risks`) lives in
app.routes.estimation. This module adds a NEW family of routes:
project-level risks that live at the project scope rather than on a
specific WBS item — cross-cutting risks like material price escalation
or regulatory approval slip.

Both kinds of risks share the underlying Risk model; the XOR invariant is
enforced at the DB layer by the ck_risk_xor_parent CHECK constraint.
The service layer filters explicitly by the appropriate parent column
so the two scopes never accidentally mix.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_any_role
from app.models.schemas.risk import (
    ProjectRiskCreate,
    ProjectRiskListResponse,
    ProjectRiskResponse,
    ProjectRiskUpdate,
)
from app.services.project_service import ProjectService
from app.services.risk_service import RiskService

# Project-scoped risk router
project_risk_router = APIRouter(prefix="/projects/{project_id}/risks", tags=["Risks"])


@project_risk_router.get("", response_model=ProjectRiskListResponse)
async def list_project_risks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List project-level risks for a project (excludes WBS-scoped risks).

    Project-level risks live at the project scope rather than on individual
    WBS items — for cross-cutting risks like material price escalation or
    regulatory approval slip that affect multiple WBS items simultaneously.
    Use this endpoint for the project's overall risk register.

    The WBS-scoped risk CRUD lives under
    /api/v1/projects/{project_id}/wbs/{wbs_id}/risks (see estimation.py).
    """
    ProjectService(db).get_or_404(project_id)

    risk_service = RiskService(db)
    items = risk_service.get_by_project(project_id)
    total = risk_service.count_by_project(project_id)

    return ProjectRiskListResponse(items=items, total=total)


@project_risk_router.get("/total-cost")
async def get_project_total_risk_cost(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get total risk cost for project-level risks under a project.

    Sums only project-level risks; WBS-scoped risks are not included
    here — sum those separately via the WBS-scoped
    /projects/{id}/wbs/{wbs_id}/risks/total-cost endpoint (in
    estimation.py), or aggregate per WBS via the dashboard's project
    rollup.
    """
    ProjectService(db).get_or_404(project_id)

    risk_service = RiskService(db)
    return {"total_risk_cost": risk_service.get_total_cost_by_project(project_id)}


@project_risk_router.post("", response_model=ProjectRiskResponse, status_code=201)
async def create_project_risk(
    project_id: int,
    risk_in: ProjectRiskCreate,
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Create a project-level risk.

    The project_id comes from the URL and is immutable post-create. The
    resulting Risk row has wbs_id=NULL, project_id={URL id} — the
    ck_risk_xor_parent CHECK constraint enforces this XOR invariant at
    the DB layer.
    """
    ProjectService(db).get_or_404(project_id)

    risk_service = RiskService(db)
    return risk_service.create_for_project(project_id, risk_in)


@project_risk_router.get("/{risk_id}", response_model=ProjectRiskResponse)
async def get_project_risk(
    project_id: int,
    risk_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch a single project-level risk by id."""
    ProjectService(db).get_or_404(project_id)

    risk_service = RiskService(db)
    risk = risk_service.get_or_404(risk_id)
    if risk.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found in this project",
        )
    return risk


@project_risk_router.put("/{risk_id}", response_model=ProjectRiskResponse)
async def update_project_risk(
    project_id: int,
    risk_id: int,
    risk_in: ProjectRiskUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Update a project-level risk.

    project_id cannot be changed (it's locked to the URL scope). Attempts
    to flip it are silently dropped by the service layer.
    """
    ProjectService(db).get_or_404(project_id)

    risk_service = RiskService(db)
    risk = risk_service.get_or_404(risk_id)
    if risk.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found in this project",
        )

    return risk_service.update_project_risk(risk_id, risk_in)


@project_risk_router.delete("/{risk_id}", status_code=204)
async def delete_project_risk(
    project_id: int,
    risk_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Delete a project-level risk."""
    ProjectService(db).get_or_404(project_id)

    risk_service = RiskService(db)
    risk = risk_service.get_or_404(risk_id)
    if risk.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found in this project",
        )

    risk_service.delete_project_risk(risk_id)
