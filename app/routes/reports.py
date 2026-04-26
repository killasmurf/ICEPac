"""Report API routes — catalog, generation, export, and async job management."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.schemas.report import (
    ReportRequest, ReportResult, ReportType, ExportFormat,
    ReportJobResponse, ReportJobListResponse, REPORT_CATALOG,
)
from app.services.report_engine import ReportEngine
from app.services.report_exporters import ReportExporter
from app.repositories.report_repository import ReportRepository

router = APIRouter(prefix="/reports", tags=["reports"])


# ════════════════════════════════════════════════════════════════
# Report Catalog
# ════════════════════════════════════════════════════════════════

@router.get("/catalog")
async def get_report_catalog(current_user=Depends(get_current_user)):
    """Get the full report catalog with categories and descriptions."""
    return REPORT_CATALOG


@router.get("/types")
async def get_report_types(current_user=Depends(get_current_user)):
    """Get list of all available report types."""
    return [{"value": rt.value, "label": rt.value.replace("_", " ").title()} for rt in ReportType]


# ════════════════════════════════════════════════════════════════
# Synchronous Report Generation (JSON preview)
# ════════════════════════════════════════════════════════════════

@router.post("/generate", response_model=ReportResult)
async def generate_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate a report and return JSON result (synchronous, for preview)."""
    engine = ReportEngine(db)
    result = engine.generate(request)
    return result


# ════════════════════════════════════════════════════════════════
# Report Export (file download)
# ════════════════════════════════════════════════════════════════

@router.post("/export")
async def export_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate and export a report as a downloadable file."""
    if request.export_format == ExportFormat.JSON:
        # For JSON, just return the result directly
        engine = ReportEngine(db)
        return engine.generate(request)

    engine = ReportEngine(db)
    result = engine.generate(request)

    content, content_type, filename = ReportExporter.export(result, request.export_format)

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ════════════════════════════════════════════════════════════════
# Specific Cost Control Reports (convenience endpoints)
# ════════════════════════════════════════════════════════════════

@router.post("/cost-by-wbs", response_model=ReportResult)
async def cost_by_wbs(request: ReportRequest, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    """Cost rollup by Work Breakdown Structure."""
    request.report_type = ReportType.COST_BY_WBS
    return ReportEngine(db).generate(request)


@router.post("/cost-by-resource", response_model=ReportResult)
async def cost_by_resource(request: ReportRequest, db: Session = Depends(get_db),
                           current_user=Depends(get_current_user)):
    """Cost breakdown by resource."""
    request.report_type = ReportType.COST_BY_RESOURCE
    return ReportEngine(db).generate(request)


@router.post("/cost-by-supplier", response_model=ReportResult)
async def cost_by_supplier(request: ReportRequest, db: Session = Depends(get_db),
                           current_user=Depends(get_current_user)):
    """Cost breakdown by supplier."""
    request.report_type = ReportType.COST_BY_SUPPLIER
    return ReportEngine(db).generate(request)


@router.post("/cost-by-eoc", response_model=ReportResult)
async def cost_by_eoc(request: ReportRequest, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    """Cost breakdown by Element of Cost."""
    request.report_type = ReportType.COST_BY_EOC
    return ReportEngine(db).generate(request)


@router.post("/cost-by-technique", response_model=ReportResult)
async def cost_by_technique(request: ReportRequest, db: Session = Depends(get_db),
                            current_user=Depends(get_current_user)):
    """Cost breakdown by estimating technique."""
    request.report_type = ReportType.COST_BY_TECHNIQUE
    return ReportEngine(db).generate(request)


# ════════════════════════════════════════════════════════════════
# BOE Reports
# ════════════════════════════════════════════════════════════════

@router.post("/boe-summary", response_model=ReportResult)
async def boe_summary(request: ReportRequest, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    """Basis of Estimate summary."""
    request.report_type = ReportType.BOE_SUMMARY
    return ReportEngine(db).generate(request)


@router.post("/boe-detailed", response_model=ReportResult)
async def boe_detailed(request: ReportRequest, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    """Detailed Basis of Estimate."""
    request.report_type = ReportType.BOE_DETAILED
    return ReportEngine(db).generate(request)


# ════════════════════════════════════════════════════════════════
# Risk Reports
# ════════════════════════════════════════════════════════════════

@router.post("/risk-assessment", response_model=ReportResult)
async def risk_assessment(request: ReportRequest, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    """Full risk assessment report."""
    request.report_type = ReportType.RISK_ASSESSMENT
    return ReportEngine(db).generate(request)


@router.post("/risk-summary", response_model=ReportResult)
async def risk_summary(request: ReportRequest, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    """Risk summary by category."""
    request.report_type = ReportType.RISK_SUMMARY
    return ReportEngine(db).generate(request)


# ════════════════════════════════════════════════════════════════
# Audit Reports
# ════════════════════════════════════════════════════════════════

@router.post("/estimator-activity", response_model=ReportResult)
async def estimator_activity(request: ReportRequest, db: Session = Depends(get_db),
                             current_user=Depends(get_current_user)):
    request.report_type = ReportType.ESTIMATOR_ACTIVITY
    return ReportEngine(db).generate(request)


@router.post("/change-history", response_model=ReportResult)
async def change_history(request: ReportRequest, db: Session = Depends(get_db),
                         current_user=Depends(get_current_user)):
    request.report_type = ReportType.CHANGE_HISTORY
    return ReportEngine(db).generate(request)


# ════════════════════════════════════════════════════════════════
# Async Report Jobs (for large reports)
# ════════════════════════════════════════════════════════════════

@router.post("/jobs", response_model=ReportJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_report_job(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Queue an async report generation job (for large reports or file exports)."""
    repo = ReportRepository(db)
    job = repo.create_job(
        user_id=current_user.id,
        report_type=request.report_type.value,
        parameters=request.filters.dict(exclude_none=True),
        output_format=request.export_format.value,
    )
    # Dispatch Celery task
    try:
        from app.tasks.report_tasks import generate_report_async
        generate_report_async.delay(job.id, request.dict())
    except Exception:
        repo.update_job(job.id, status="failed", error_message="Failed to queue task")

    return ReportJobResponse.from_orm(job)


@router.get("/jobs", response_model=ReportJobListResponse)
async def list_report_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List report jobs for the current user."""
    repo = ReportRepository(db)
    jobs = repo.list_jobs(current_user.id, skip=skip, limit=limit)
    total = repo.count_jobs(current_user.id)
    return {"items": [ReportJobResponse.from_orm(j) for j in jobs], "total": total}


@router.get("/jobs/{job_id}", response_model=ReportJobResponse)
async def get_report_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get status of a report job."""
    repo = ReportRepository(db)
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Report job {job_id} not found")
    return ReportJobResponse.from_orm(job)
