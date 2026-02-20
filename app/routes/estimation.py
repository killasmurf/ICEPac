"""Estimation routes - assignments, risks, cost summaries, and approval workflow."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.schemas.assignment import (
    AssignmentCreate,
    AssignmentListResponse,
    AssignmentResponse,
    AssignmentUpdate,
)
from app.models.schemas.estimation import (
    ApprovalAction,
    ProjectEstimationSummary,
    WBSApprovalResponse,
    WBSCostSummary,
)
from app.models.schemas.risk import (
    RiskCreate,
    RiskListResponse,
    RiskResponse,
    RiskUpdate,
)
from app.repositories.wbs_repository import WBSRepository
from app.services.approval_service import ApprovalService
from app.services.assignment_service import AssignmentService
from app.services.estimation_service import EstimationService
from app.services.project_service import ProjectService
from app.services.risk_service import RiskService

router = APIRouter(prefix="/projects")


# =============================================================================
# Helper: Validate project and WBS exist
# =============================================================================


def _validate_project_wbs(db: Session, project_id: int, wbs_id: int):
    """Validate project and WBS exist and WBS belongs to project."""
    ProjectService(db).get_or_404(project_id)
    wbs_repo = WBSRepository(db)
    wbs = wbs_repo.get(wbs_id)
    if not wbs or wbs.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WBS item not found in this project",
        )
    return wbs


# =============================================================================
# Assignment CRUD
# =============================================================================


@router.get(
    "/{project_id}/wbs/{wbs_id}/assignments",
    response_model=AssignmentListResponse,
    tags=["Assignments"],
)
async def list_assignments(
    project_id: int,
    wbs_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all assignments for a WBS item."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = AssignmentService(db)
    assignments = service.get_by_wbs(wbs_id)
    return AssignmentListResponse(items=assignments, total=len(assignments))


@router.post(
    "/{project_id}/wbs/{wbs_id}/assignments",
    response_model=AssignmentResponse,
    status_code=201,
    tags=["Assignments"],
)
async def create_assignment(
    project_id: int,
    wbs_id: int,
    assignment_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new assignment for a WBS item."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = AssignmentService(db)
    return service.create(wbs_id, assignment_in)


@router.get(
    "/{project_id}/wbs/{wbs_id}/assignments/{assignment_id}",
    response_model=AssignmentResponse,
    tags=["Assignments"],
)
async def get_assignment(
    project_id: int,
    wbs_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single assignment."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = AssignmentService(db)
    assignment = service.get_or_404(assignment_id)
    if assignment.wbs_id != wbs_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.put(
    "/{project_id}/wbs/{wbs_id}/assignments/{assignment_id}",
    response_model=AssignmentResponse,
    tags=["Assignments"],
)
async def update_assignment(
    project_id: int,
    wbs_id: int,
    assignment_id: int,
    assignment_in: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an assignment."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = AssignmentService(db)
    assignment = service.get_or_404(assignment_id)
    if assignment.wbs_id != wbs_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return service.update(assignment_id, assignment_in)


@router.delete(
    "/{project_id}/wbs/{wbs_id}/assignments/{assignment_id}",
    status_code=204,
    tags=["Assignments"],
)
async def delete_assignment(
    project_id: int,
    wbs_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete an assignment."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = AssignmentService(db)
    assignment = service.get_or_404(assignment_id)
    if assignment.wbs_id != wbs_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    service.delete(assignment_id)


# =============================================================================
# Risk CRUD
# =============================================================================


@router.get(
    "/{project_id}/wbs/{wbs_id}/risks",
    response_model=RiskListResponse,
    tags=["Risks"],
)
async def list_risks(
    project_id: int,
    wbs_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all risks for a WBS item with computed exposure."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = RiskService(db)
    risks_with_exposure = service.get_by_wbs_with_exposure(wbs_id)

    # Build response with exposure added
    items = []
    for item in risks_with_exposure:
        risk = item["risk"]
        response = RiskResponse.model_validate(risk)
        response.risk_exposure = item["risk_exposure"]
        items.append(response)

    return RiskListResponse(items=items, total=len(items))


@router.post(
    "/{project_id}/wbs/{wbs_id}/risks",
    response_model=RiskResponse,
    status_code=201,
    tags=["Risks"],
)
async def create_risk(
    project_id: int,
    wbs_id: int,
    risk_in: RiskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new risk for a WBS item."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = RiskService(db)
    risk = service.create(wbs_id, risk_in)
    response = RiskResponse.model_validate(risk)
    response.risk_exposure = service.compute_risk_exposure(risk)
    return response


@router.get(
    "/{project_id}/wbs/{wbs_id}/risks/{risk_id}",
    response_model=RiskResponse,
    tags=["Risks"],
)
async def get_risk(
    project_id: int,
    wbs_id: int,
    risk_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single risk with computed exposure."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = RiskService(db)
    risk = service.get_or_404(risk_id)
    if risk.wbs_id != wbs_id:
        raise HTTPException(status_code=404, detail="Risk not found")
    response = RiskResponse.model_validate(risk)
    response.risk_exposure = service.compute_risk_exposure(risk)
    return response


@router.put(
    "/{project_id}/wbs/{wbs_id}/risks/{risk_id}",
    response_model=RiskResponse,
    tags=["Risks"],
)
async def update_risk(
    project_id: int,
    wbs_id: int,
    risk_id: int,
    risk_in: RiskUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a risk."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = RiskService(db)
    risk = service.get_or_404(risk_id)
    if risk.wbs_id != wbs_id:
        raise HTTPException(status_code=404, detail="Risk not found")
    updated = service.update(risk_id, risk_in)
    response = RiskResponse.model_validate(updated)
    response.risk_exposure = service.compute_risk_exposure(updated)
    return response


@router.delete(
    "/{project_id}/wbs/{wbs_id}/risks/{risk_id}",
    status_code=204,
    tags=["Risks"],
)
async def delete_risk(
    project_id: int,
    wbs_id: int,
    risk_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a risk."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = RiskService(db)
    risk = service.get_or_404(risk_id)
    if risk.wbs_id != wbs_id:
        raise HTTPException(status_code=404, detail="Risk not found")
    service.delete(risk_id)


# =============================================================================
# Estimation Summaries
# =============================================================================


@router.get(
    "/{project_id}/estimation",
    response_model=ProjectEstimationSummary,
    tags=["Estimation"],
)
async def get_project_estimation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get full project cost estimation with breakdowns."""
    service = EstimationService(db)
    return service.get_project_estimation(project_id)


@router.get(
    "/{project_id}/wbs/{wbs_id}/estimation",
    response_model=WBSCostSummary,
    tags=["Estimation"],
)
async def get_wbs_estimation(
    project_id: int,
    wbs_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get cost estimation for a single WBS item."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = EstimationService(db)
    return service.get_wbs_cost_summary(wbs_id)


# =============================================================================
# Approval Workflow
# =============================================================================


@router.get(
    "/{project_id}/wbs/{wbs_id}/approval",
    response_model=WBSApprovalResponse,
    tags=["Approval"],
)
async def get_approval_status(
    project_id: int,
    wbs_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the current approval status of a WBS item."""
    _validate_project_wbs(db, project_id, wbs_id)
    service = ApprovalService(db)
    wbs = service.get_approval_status(wbs_id)
    return WBSApprovalResponse.model_validate(wbs)


@router.post(
    "/{project_id}/wbs/{wbs_id}/approval",
    response_model=WBSApprovalResponse,
    tags=["Approval"],
)
async def process_approval_action(
    project_id: int,
    wbs_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Process an approval action (submit, approve, reject, reset).

    - submit: Any authenticated user can submit their own WBS
    - approve/reject: Requires admin or manager role
    - reset: Any authenticated user can reset rejected items to draft
    """
    _validate_project_wbs(db, project_id, wbs_id)
    service = ApprovalService(db)

    # Check role for approve/reject
    if action.action in ("approve", "reject"):
        if current_user.role not in ("admin", "manager"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers and admins can approve or reject",
            )

    # Dispatch to appropriate service method
    if action.action == "submit":
        wbs = service.submit_for_approval(
            wbs_id, current_user.id, current_user.username
        )
    elif action.action == "approve":
        wbs = service.approve(wbs_id, current_user.id, current_user.username)
    elif action.action == "reject":
        wbs = service.reject(
            wbs_id, current_user.id, current_user.username, action.comment
        )
    elif action.action == "reset":
        wbs = service.reset_to_draft(wbs_id, current_user.id, current_user.username)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: {action.action}",
        )

    return WBSApprovalResponse.model_validate(wbs)
