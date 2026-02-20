"""Project routes — full CRUD + MPP file import."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.database.user import User
from app.models.schemas.project import (
    MPPUploadResponse,
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
    WBSCreate,
    WBSListResponse,
    WBSResponse,
    WBSUpdate,
)
from app.services.mpp_reader import MPPReader
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper dependency
# ---------------------------------------------------------------------------

def _get_service(db: Session = Depends(get_db)) -> ProjectService:
    return ProjectService(db)


# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=ProjectListResponse)
def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_archived: bool = Query(False),
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """List projects (active by default)."""
    active_only = not include_archived
    items = svc.get_multi(skip=skip, limit=limit, active_only=active_only)
    total = svc.count(active_only=active_only)

    responses = []
    for p in items:
        r = ProjectResponse.model_validate(p)
        r.wbs_count = svc.count_wbs_by_project(p.id)
        responses.append(r)

    return ProjectListResponse(items=responses, total=total, skip=skip, limit=limit)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new project."""
    project = svc.create(project_in)
    logger.info("Created project id=%s name='%s'", project.id, project.project_name)
    r = ProjectResponse.model_validate(project)
    r.wbs_count = 0
    return r


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a project with its WBS items."""
    project = svc.get_with_wbs(project_id)
    r = ProjectDetailResponse.model_validate(project)
    r.wbs_count = len(project.wbs_items)
    r.wbs_items = [WBSResponse.model_validate(w) for w in project.wbs_items]
    return r


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Update project metadata."""
    project = svc.update(project_id, project_in)
    r = ProjectResponse.model_validate(project)
    r.wbs_count = svc.count_wbs_by_project(project_id)
    return r


@router.post("/{project_id}/archive", response_model=ProjectResponse)
def archive_project(
    project_id: int,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Archive (soft-delete) a project."""
    project = svc.archive(project_id)
    r = ProjectResponse.model_validate(project)
    r.wbs_count = svc.count_wbs_by_project(project_id)
    return r


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a project and all its WBS items."""
    svc.delete(project_id)
    logger.info("Deleted project id=%s", project_id)


# ---------------------------------------------------------------------------
# WBS sub-resource
# ---------------------------------------------------------------------------

@router.get("/{project_id}/wbs", response_model=WBSListResponse)
def list_wbs(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """List WBS items for a project."""
    items = svc.get_wbs_by_project(project_id, skip=skip, limit=limit)
    total = svc.count_wbs_by_project(project_id)
    return WBSListResponse(
        items=[WBSResponse.model_validate(w) for w in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/{project_id}/wbs", response_model=WBSResponse, status_code=status.HTTP_201_CREATED)
def create_wbs(
    project_id: int,
    wbs_in: WBSCreate,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Add a WBS item to a project."""
    wbs = svc.create_wbs(project_id, wbs_in)
    return WBSResponse.model_validate(wbs)


@router.put("/{project_id}/wbs/{wbs_id}", response_model=WBSResponse)
def update_wbs(
    project_id: int,
    wbs_id: int,
    wbs_in: WBSUpdate,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Update a WBS item."""
    wbs = svc.get_wbs_or_404(wbs_id)
    if wbs.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WBS item not found")
    wbs = svc.update_wbs(wbs_id, wbs_in)
    return WBSResponse.model_validate(wbs)


@router.delete("/{project_id}/wbs/{wbs_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wbs(
    project_id: int,
    wbs_id: int,
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a WBS item."""
    wbs = svc.get_wbs_or_404(wbs_id)
    if wbs.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WBS item not found")
    svc.delete_wbs(wbs_id)


# ---------------------------------------------------------------------------
# MPP file upload / import
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=MPPUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_mpp(
    file: UploadFile = File(...),
    project_name: Optional[str] = Query(default=None, max_length=255),
    svc: ProjectService = Depends(_get_service),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a Microsoft Project file (.mpp / .mpx / .xml), parse it,
    and persist the project + WBS items to the database.
    """
    filename = file.filename or ""
    if not any(filename.lower().endswith(ext) for ext in (".mpp", ".mpx", ".xml")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed: .mpp, .mpx, .xml",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    try:
        reader = MPPReader()
        parsed = reader.parse(contents, filename)
    except Exception as exc:
        logger.error("MPP parse error for '%s': %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse file: {exc}",
        )

    name = project_name or parsed.get("name") or filename
    project, wbs_count = svc.import_from_mpp(name, parsed.get("tasks", []))
    logger.info("Imported project id=%s '%s' with %d WBS items", project.id, name, wbs_count)

    return MPPUploadResponse(
        project_id=project.id,
        project_name=project.project_name,
        wbs_items_imported=wbs_count,
        message=f"Successfully imported '{project.project_name}' with {wbs_count} WBS items.",
    )
