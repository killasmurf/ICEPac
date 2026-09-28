"""Report service - generates cost control, BOE, and risk summary reports."""
import math
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.report import GeneratedReport, ReportFormat, ReportStatus, ReportType
from app.models.schemas.report import (
    BOELineItem,
    BOEReport,
    CostControlLineItem,
    CostControlReport,
    RiskSummaryItem,
    RiskSummaryReport,
    WBSSummaryReport,
)
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.risk_repository import RiskRepository
from app.repositories.wbs_repository import WBSRepository
from app.services.risk_service import RiskService

Z_80 = 1.28


class ReportService:
    """Service for generating and retrieving project reports."""

    def __init__(self, db: Session):
        self.db = db
        self.report_repo = ReportRepository(db)
        self.project_repo = ProjectRepository(db)
        self.wbs_repo = WBSRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.risk_repo = RiskRepository(db)
        self.risk_service = RiskService(db)

    # ------------------------------------------------------------------
    # CRUD helpers
    # ------------------------------------------------------------------

    def get_or_404(self, report_id: int) -> GeneratedReport:
        report = self.report_repo.get(report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return report

    def list_for_project(self, project_id: int, skip: int = 0, limit: int = 50):
        self._get_project_or_404(project_id)
        items = self.report_repo.get_by_project(project_id, skip=skip, limit=limit)
        total = self.report_repo.count_by_project(project_id)
        return items, total

    def delete(self, report_id: int) -> bool:
        return self.report_repo.delete(report_id)

    # ------------------------------------------------------------------
    # Report generation
    # ------------------------------------------------------------------

    def generate(
        self,
        project_id: int,
        report_type: ReportType,
        report_format: ReportFormat,
        title: Optional[str],
        user_id: Optional[int],
    ) -> GeneratedReport:
        """Create a report record and generate synchronously (JSON) or mark pending."""
        project = self._get_project_or_404(project_id)

        default_title = title or f"{report_type.value.replace('_', ' ').title()} — {project.project_name}"
        record = self.report_repo.create(
            {
                "project_id": project_id,
                "requested_by": user_id,
                "report_type": report_type,
                "report_format": report_format,
                "status": ReportStatus.GENERATING,
                "title": default_title,
            }
        )

        try:
            if report_format == ReportFormat.JSON:
                # Generate synchronously for JSON (no file storage needed)
                self.report_repo.mark_ready(record.id)
            else:
                # Non-JSON formats would go through Celery; mark pending for now
                self.report_repo.update(record, {"status": ReportStatus.PENDING})
        except Exception as exc:
            self.report_repo.mark_failed(record.id, str(exc))

        self.db.refresh(record)
        return record

    def get_report_data(self, report_id: int) -> dict:
        """Fetch the computed data for a report (JSON format only)."""
        report = self.get_or_404(report_id)
        if report.report_format != ReportFormat.JSON:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data endpoint only available for JSON-format reports",
            )
        if report.status != ReportStatus.READY:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Report is not ready (status: {report.status.value})",
            )

        generators = {
            ReportType.COST_CONTROL: self._build_cost_control,
            ReportType.BOE: self._build_boe,
            ReportType.RISK_SUMMARY: self._build_risk_summary,
            ReportType.WBS_SUMMARY: self._build_wbs_summary,
            ReportType.RESOURCE_UTILIZATION: self._build_wbs_summary,
        }
        generator = generators.get(report.report_type)
        if not generator:
            raise HTTPException(status_code=500, detail="Unknown report type")

        return generator(report.project_id).model_dump()

    # ------------------------------------------------------------------
    # Report builders
    # ------------------------------------------------------------------

    def _get_project_or_404(self, project_id: int):
        project = self.project_repo.get(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project

    def _build_cost_control(self, project_id: int) -> CostControlReport:
        project = self._get_project_or_404(project_id)
        wbs_items = self.wbs_repo.get_by_project(project_id, skip=0, limit=10000)
        assignments = self.assignment_repo.get_by_project(project_id)
        risks = self.risk_repo.get_by_project(project_id)

        total_pert = 0.0
        total_variance = 0.0
        total_exposure = 0.0
        line_items = []

        for wbs in wbs_items:
            wbs_assignments = [a for a in assignments if a.wbs_id == wbs.id]
            wbs_risks = [r for r in risks if r.wbs_id == wbs.id]

            best = sum(float(a.best_estimate) for a in wbs_assignments)
            likely = sum(float(a.likely_estimate) for a in wbs_assignments)
            worst = sum(float(a.worst_estimate) for a in wbs_assignments)
            pert = sum(a.pert_estimate for a in wbs_assignments)
            variance = sum(a.std_deviation ** 2 for a in wbs_assignments)
            std = math.sqrt(variance) if variance else 0.0
            exposure = sum(self.risk_service.compute_risk_exposure(r) for r in wbs_risks)

            total_pert += pert
            total_variance += variance
            total_exposure += exposure

            line_items.append(
                CostControlLineItem(
                    wbs_code=wbs.wbs_code,
                    wbs_title=wbs.wbs_title,
                    assignment_count=len(wbs_assignments),
                    best_estimate=best,
                    likely_estimate=likely,
                    worst_estimate=worst,
                    pert_estimate=pert,
                    std_deviation=std,
                    risk_exposure=exposure,
                    risk_adjusted=pert + exposure,
                    approval_status=wbs.approval_status,
                )
            )

        total_std = math.sqrt(total_variance) if total_variance else 0.0
        margin = Z_80 * total_std

        return CostControlReport(
            project_id=project_id,
            project_name=project.project_name,
            generated_at=datetime.utcnow(),
            total_pert=total_pert,
            total_risk_exposure=total_exposure,
            total_risk_adjusted=total_pert + total_exposure,
            confidence_80_low=total_pert - margin,
            confidence_80_high=total_pert + margin,
            line_items=line_items,
        )

    def _build_boe(self, project_id: int) -> BOEReport:
        project = self._get_project_or_404(project_id)
        wbs_items = self.wbs_repo.get_by_project(project_id, skip=0, limit=10000)
        wbs_map = {w.id: w for w in wbs_items}
        assignments = self.assignment_repo.get_by_project(project_id)

        total_pert = 0.0
        line_items = []

        for a in assignments:
            wbs = wbs_map.get(a.wbs_id)
            pert = a.pert_estimate
            total_pert += pert
            line_items.append(
                BOELineItem(
                    wbs_code=wbs.wbs_code if wbs else None,
                    wbs_title=wbs.wbs_title if wbs else "Unknown",
                    resource_code=a.resource_code,
                    cost_type_code=a.cost_type_code,
                    estimating_technique_code=a.estimating_technique_code,
                    best_estimate=float(a.best_estimate),
                    likely_estimate=float(a.likely_estimate),
                    worst_estimate=float(a.worst_estimate),
                    pert_estimate=pert,
                )
            )

        return BOEReport(
            project_id=project_id,
            project_name=project.project_name,
            generated_at=datetime.utcnow(),
            total_pert=total_pert,
            line_items=line_items,
        )

    def _build_risk_summary(self, project_id: int) -> RiskSummaryReport:
        project = self._get_project_or_404(project_id)
        wbs_items = self.wbs_repo.get_by_project(project_id, skip=0, limit=10000)
        wbs_map = {w.id: w for w in wbs_items}
        risks = self.risk_repo.get_by_project(project_id)

        groups: dict = {}
        for r in risks:
            wid = r.wbs_id
            if wid not in groups:
                groups[wid] = {"risks": [], "exposures": []}
            exposure = self.risk_service.compute_risk_exposure(r)
            groups[wid]["risks"].append(r)
            groups[wid]["exposures"].append(exposure)

        total_exposure = 0.0
        items = []
        for wid, data in groups.items():
            wbs = wbs_map.get(wid)
            wbs_exposure = sum(data["exposures"])
            total_exposure += wbs_exposure
            items.append(
                RiskSummaryItem(
                    wbs_code=wbs.wbs_code if wbs else None,
                    wbs_title=wbs.wbs_title if wbs else "Unknown",
                    risk_count=len(data["risks"]),
                    total_exposure=wbs_exposure,
                    max_exposure=max(data["exposures"]) if data["exposures"] else 0.0,
                )
            )

        items.sort(key=lambda x: x.total_exposure, reverse=True)

        return RiskSummaryReport(
            project_id=project_id,
            project_name=project.project_name,
            generated_at=datetime.utcnow(),
            total_risks=len(risks),
            total_exposure=total_exposure,
            items=items,
        )

    def _build_wbs_summary(self, project_id: int) -> WBSSummaryReport:
        from app.services.estimation_service import EstimationService
        estimation = EstimationService(self.db)
        summary = estimation.get_project_estimation(project_id)

        return WBSSummaryReport(
            project_id=project_id,
            project_name=summary.project_name,
            generated_at=datetime.utcnow(),
            wbs_count=summary.total_wbs_items,
            assignment_count=summary.total_assignments,
            total_pert=summary.total_pert_estimate,
            by_cost_type=[item.model_dump() for item in summary.by_cost_type],
            by_region=[item.model_dump() for item in summary.by_region],
            by_resource=[item.model_dump() for item in summary.by_resource],
        )
