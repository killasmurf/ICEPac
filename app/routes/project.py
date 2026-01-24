"""Project routes."""
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_any_role
from app.models.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects")


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List active projects with optional search."""
    service = ProjectService(db)
    if search:
        items = service.search(search, skip=skip, limit=limit)
        total = service.count_search(search)
    else:
        items = service.get_multi(skip=skip, limit=limit)
        total = service.count()
    return ProjectListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single project by ID."""
    service = ProjectService(db)
    return service.get_or_404(project_id)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Create a new project."""
    service = ProjectService(db)
    return service.create(project_in)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Update a project."""
    service = ProjectService(db)
    return service.update(project_id, project_in)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Archive a project (soft delete)."""
    service = ProjectService(db)
    service.delete(project_id)


@router.post("/upload")
async def upload_project_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Upload and parse a Microsoft Project file."""
    if not file.filename.endswith((".mpp", ".mpx", ".xml")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported: .mpp, .mpx, .xml",
        )

    try:
        from app.services.mpp_reader import MPPReader

        contents = await file.read()
        reader = MPPReader()
        project_data = reader.parse(contents, file.filename)
        return {
            "status": "success",
            "filename": file.filename,
            "data": project_data,
        }
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="MPP parsing not available (Java/MPXJ not configured)",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
