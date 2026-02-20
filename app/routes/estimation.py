"""Estimation routes: resource assignments, risks, and estimate summaries."""
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.database.user import User
from app.models.schemas.estimation import (
    AssignmentCreate,
    AssignmentListResponse,
    AssignmentResponse,
    AssignmentUpdate,
    ProjectEstimateSummary,
    RiskCreate,
    RiskListResponse,
    RiskResponse,
    RiskUpdate,
)
from app.services.estimation_service import EstimationService

router = APIRouter(tags=["Estimation"])
logger = logging.getLogger(__name__)


def _get_svc(db: Session = Depends(get_db)) -> EstimationService:
    return EstimationService(db)


# ---------------------------------------------------------------------------
# Project-level estimate summary
# ---------------------------------------------------------------------------

@router.get("/projects/{project_id}/estimates", response_model=ProjectEstimateSummary)
def get_project_estimates(
    project_id: int,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Return PERT roll-up totals for every WBS item in a project."""
    return svc.project_estimate_summary(project_id)


# ---------------------------------------------------------------------------
# Resource Assignments (nested under /projects/{id}/wbs/{wbs_id})
# ---------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/wbs/{wbs_id}/assignments",
    response_model=AssignmentListResponse,
)
def list_assignments(
    project_id: int,
    wbs_id: int,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """List all resource assignments for a WBS item."""
    items = svc.list_assignments(project_id, wbs_id)
    return AssignmentListResponse(
        items=[AssignmentResponse.model_validate(a) for a in items],
        total=len(items),
    )


@router.post(
    "/projects/{project_id}/wbs/{wbs_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    project_id: int,
    wbs_id: int,
    assignment_in: AssignmentCreate,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Add a resource assignment (with three-point estimates) to a WBS item."""
    assignment = svc.create_assignment(project_id, wbs_id, assignment_in)
    logger.info(
        "Created assignment id=%s wbs=%s resource='%s'",
        assignment.id, wbs_id, assignment.resource_code,
    )
    return AssignmentResponse.model_validate(assignment)


@router.put(
    "/projects/{project_id}/wbs/{wbs_id}/assignments/{assignment_id}",
    response_model=AssignmentResponse,
)
def update_assignment(
    project_id: int,
    wbs_id: int,
    assignment_id: int,
    assignment_in: AssignmentUpdate,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Update estimate values for a resource assignment."""
    assignment = svc.update_assignment(project_id, wbs_id, assignment_id, assignment_in)
    return AssignmentResponse.model_validate(assignment)


@router.delete(
    "/projects/{project_id}/wbs/{wbs_id}/assignments/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_assignment(
    project_id: int,
    wbs_id: int,
    assignment_id: int,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Remove a resource assignment from a WBS item."""
    svc.delete_assignment(project_id, wbs_id, assignment_id)


# ---------------------------------------------------------------------------
# Risks (nested under /projects/{id}/wbs/{wbs_id})
# ---------------------------------------------------------------------------

@router.get(
    "/projects/{project_id}/wbs/{wbs_id}/risks",
    response_model=RiskListResponse,
)
def list_risks(
    project_id: int,
    wbs_id: int,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """List all risks for a WBS item."""
    items = svc.list_risks(project_id, wbs_id)
    return RiskListResponse(
        items=[RiskResponse.model_validate(r) for r in items],
        total=len(items),
    )


@router.post(
    "/projects/{project_id}/wbs/{wbs_id}/risks",
    response_model=RiskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_risk(
    project_id: int,
    wbs_id: int,
    risk_in: RiskCreate,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Add a risk to a WBS item."""
    risk = svc.create_risk(project_id, wbs_id, risk_in)
    logger.info("Created risk id=%s wbs=%s", risk.id, wbs_id)
    return RiskResponse.model_validate(risk)


@router.put(
    "/projects/{project_id}/wbs/{wbs_id}/risks/{risk_id}",
    response_model=RiskResponse,
)
def update_risk(
    project_id: int,
    wbs_id: int,
    risk_id: int,
    risk_in: RiskUpdate,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Update a risk entry."""
    risk = svc.update_risk(project_id, wbs_id, risk_id, risk_in)
    return RiskResponse.model_validate(risk)


@router.delete(
    "/projects/{project_id}/wbs/{wbs_id}/risks/{risk_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_risk(
    project_id: int,
    wbs_id: int,
    risk_id: int,
    svc: EstimationService = Depends(_get_svc),
    current_user: User = Depends(get_current_user),
):
    """Remove a risk from a WBS item."""
    svc.delete_risk(project_id, wbs_id, risk_id)
