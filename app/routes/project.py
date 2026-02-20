"""Project routes."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_any_role
from app.models.schemas.import_job import (
    ImportJobListResponse,
    ImportJobResponse,
    ImportStartResponse,
)
from app.models.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.models.schemas.wbs import WBSListResponse, WBSTreeNode, WBSTreeResponse
from app.repositories.wbs_repository import WBSRepository
from app.services.import_service import ImportService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects")


# ============================================================
# Project CRUD
# ============================================================


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


# ============================================================
# Import endpoints
# ============================================================


@router.post(
    "/{project_id}/import", response_model=ImportStartResponse, status_code=202
)
async def import_project_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Upload an MS Project file and start async import."""
    service = ImportService(db)
    job = await service.start_import(project_id, file, current_user.id)
    return ImportStartResponse(
        job_id=job.id,
        status=job.status.value,
        message=f"Import started for '{job.filename}'",
    )


@router.get("/{project_id}/imports", response_model=ImportJobListResponse)
async def list_imports(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all import jobs for a project."""
    service = ImportService(db)
    jobs = service.get_project_imports(project_id)
    return ImportJobListResponse(items=jobs, total=len(jobs))


@router.get("/{project_id}/imports/{job_id}", response_model=ImportJobResponse)
async def get_import_status(
    project_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Poll import job status."""
    service = ImportService(db)
    job = service.get_import_status(job_id)
    if not job or job.project_id != project_id:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job


# ============================================================
# WBS endpoints
# ============================================================


@router.get("/{project_id}/wbs", response_model=WBSListResponse)
async def list_wbs(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get flat paginated WBS list for a project."""
    # Verify project exists
    ProjectService(db).get_or_404(project_id)
    repo = WBSRepository(db)
    items = repo.get_by_project(project_id, skip=skip, limit=limit)
    total = repo.count_by_project(project_id)
    return WBSListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{project_id}/wbs/tree", response_model=WBSTreeResponse)
async def get_wbs_tree(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get hierarchical WBS tree for a project."""
    ProjectService(db).get_or_404(project_id)
    repo = WBSRepository(db)

    # Fetch all items flat, build tree in memory
    all_items = repo.get_by_project(project_id, skip=0, limit=10000)
    total = len(all_items)

    # Build lookup by ID
    nodes = {}
    for item in all_items:
        node = WBSTreeNode.model_validate(item)
        node.children = []
        nodes[item.id] = node

    # Link parents
    roots = []
    for item in all_items:
        node = nodes[item.id]
        if item.parent_id and item.parent_id in nodes:
            nodes[item.parent_id].children.append(node)
        else:
            roots.append(node)

    return WBSTreeResponse(items=roots, total=total)


# ============================================================
# Legacy upload endpoint (kept for backward compatibility)
# ============================================================


@router.post("/upload")
async def upload_project_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_any_role("admin", "manager")),
):
    """Upload and parse a Microsoft Project file (legacy sync endpoint)."""
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
