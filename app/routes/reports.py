"""Reports routes - generate and retrieve project reports."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.database.report import ReportFormat, ReportType
from app.models.schemas.report import ReportListResponse, ReportRequest, ReportResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/projects")


@router.get(
    "/{project_id}/reports",
    response_model=ReportListResponse,
    tags=["Reports"],
)
async def list_reports(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all generated reports for a project."""
    service = ReportService(db)
    items, total = service.list_for_project(project_id, skip=skip, limit=limit)
    return ReportListResponse(items=items, total=total)


@router.post(
    "/{project_id}/reports",
    response_model=ReportResponse,
    status_code=201,
    tags=["Reports"],
)
async def generate_report(
    project_id: int,
    req: ReportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate a new report for a project."""
    service = ReportService(db)
    report = service.generate(
        project_id=project_id,
        report_type=req.report_type,
        report_format=req.report_format,
        title=req.title,
        user_id=current_user.id,
    )
    return report


@router.get(
    "/{project_id}/reports/{report_id}",
    response_model=ReportResponse,
    tags=["Reports"],
)
async def get_report(
    project_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a report record (metadata and status)."""
    service = ReportService(db)
    report = service.get_or_404(report_id)
    if report.project_id != project_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.get(
    "/{project_id}/reports/{report_id}/data",
    tags=["Reports"],
)
async def get_report_data(
    project_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the computed data payload for a JSON-format report."""
    service = ReportService(db)
    report = service.get_or_404(report_id)
    if report.project_id != project_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return service.get_report_data(report_id)


@router.delete(
    "/{project_id}/reports/{report_id}",
    status_code=204,
    tags=["Reports"],
)
async def delete_report(
    project_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a report."""
    service = ReportService(db)
    report = service.get_or_404(report_id)
    if report.project_id != project_id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    service.delete(report_id)
