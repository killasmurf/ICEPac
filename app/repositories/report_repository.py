"""Report repository with complex aggregation queries for cost rollups."""
import math
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from datetime import datetime, date

from app.models.database.project import Project
from app.models.database.wbs import WBS
from app.models.database.assignment import ResourceAssignment
from app.models.database.risk import Risk
from app.models.database.resource import Resource, Supplier
from app.models.database.config_tables import (
    CostType, Region, BusinessArea, EstimatingTechnique, RiskCategory,
    ProbabilityLevel, SeverityLevel,
)
from app.models.database.audit_log import AuditLog
from app.models.database.report import ReportJob
from app.models.schemas.report import ReportFilter


Z_80 = 1.28  # z-score for 80% confidence


class ReportRepository:
    """Complex aggregation queries for report generation."""

    def __init__(self, db: Session):
        self.db = db

    # ── Helper: Base assignment query with filters ────────────

    def _base_assignment_query(self, filters: ReportFilter):
        """Build filtered query joining assignments → WBS → project."""
        q = (
            self.db.query(ResourceAssignment)
            .join(WBS, ResourceAssignment.wbs_id == WBS.id)
            .filter(WBS.project_id == filters.project_id)
        )
        if filters.wbs_ids:
            q = q.filter(WBS.id.in_(filters.wbs_ids))
        if filters.cost_type_codes:
            q = q.filter(ResourceAssignment.cost_type_code.in_(filters.cost_type_codes))
        if filters.region_codes:
            q = q.filter(ResourceAssignment.region_code.in_(filters.region_codes))
        if filters.resource_codes:
            q = q.filter(ResourceAssignment.resource_code.in_(filters.resource_codes))
        if filters.supplier_codes:
            q = q.filter(ResourceAssignment.supplier_code.in_(filters.supplier_codes))
        if filters.technique_codes:
            q = q.filter(ResourceAssignment.estimating_technique_code.in_(filters.technique_codes))
        if filters.approval_status:
            q = q.filter(WBS.approval_status == filters.approval_status)
        return q

    # ── Cost Rollup: Generic group-by ─────────────────────────

    def cost_rollup_by(self, filters: ReportFilter, group_column, label_column=None) -> List[Dict[str, Any]]:
        """Generic cost rollup grouped by any column."""
        q = self._base_assignment_query(filters)
        rows = (
            q.with_entities(
                group_column.label("group_key"),
                (label_column or group_column).label("group_label"),
                func.sum(ResourceAssignment.best_estimate).label("best_total"),
                func.sum(ResourceAssignment.likely_estimate).label("likely_total"),
                func.sum(ResourceAssignment.worst_estimate).label("worst_total"),
                func.count(ResourceAssignment.id).label("assignment_count"),
            )
            .group_by(group_column, label_column or group_column)
            .order_by(func.sum(ResourceAssignment.likely_estimate).desc())
            .all()
        )
        results = []
        for row in rows:
            best = float(row.best_total or 0)
            likely = float(row.likely_total or 0)
            worst = float(row.worst_total or 0)
            pert = (best + 4 * likely + worst) / 6
            std_dev = (worst - best) / 6
            results.append({
                "group_key": row.group_key or "Unassigned",
                "group_label": row.group_label or "Unassigned",
                "best_total": round(best, 2),
                "likely_total": round(likely, 2),
                "worst_total": round(worst, 2),
                "pert_total": round(pert, 2),
                "std_dev": round(std_dev, 2),
                "confidence_80_low": round(pert - Z_80 * std_dev, 2),
                "confidence_80_high": round(pert + Z_80 * std_dev, 2),
                "assignment_count": row.assignment_count,
            })
        return results

    # ── Specific Cost Reports ─────────────────────────────────

    def cost_by_wbs(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        q = self._base_assignment_query(filters)
        rows = (
            q.with_entities(
                WBS.id.label("group_key"),
                WBS.title.label("group_label"),
                WBS.wbs_code,
                WBS.approval_status,
                func.sum(ResourceAssignment.best_estimate).label("best_total"),
                func.sum(ResourceAssignment.likely_estimate).label("likely_total"),
                func.sum(ResourceAssignment.worst_estimate).label("worst_total"),
                func.count(ResourceAssignment.id).label("assignment_count"),
            )
            .group_by(WBS.id, WBS.title, WBS.wbs_code, WBS.approval_status)
            .order_by(WBS.wbs_code)
            .all()
        )
        results = []
        for row in rows:
            best = float(row.best_total or 0)
            likely = float(row.likely_total or 0)
            worst = float(row.worst_total or 0)
            pert = (best + 4 * likely + worst) / 6
            std_dev = (worst - best) / 6
            results.append({
                "group_key": str(row.group_key),
                "group_label": f"{row.wbs_code} - {row.group_label}",
                "wbs_code": row.wbs_code,
                "approval_status": row.approval_status,
                "best_total": round(best, 2),
                "likely_total": round(likely, 2),
                "worst_total": round(worst, 2),
                "pert_total": round(pert, 2),
                "std_dev": round(std_dev, 2),
                "confidence_80_low": round(pert - Z_80 * std_dev, 2),
                "confidence_80_high": round(pert + Z_80 * std_dev, 2),
                "assignment_count": row.assignment_count,
            })
        return results

    def cost_by_resource(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        return self.cost_rollup_by(filters, ResourceAssignment.resource_code)

    def cost_by_supplier(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        return self.cost_rollup_by(filters, ResourceAssignment.supplier_code)

    def cost_by_eoc(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        return self.cost_rollup_by(filters, ResourceAssignment.cost_type_code)

    def cost_by_technique(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        return self.cost_rollup_by(filters, ResourceAssignment.estimating_technique_code)

    def cost_by_region(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        return self.cost_rollup_by(filters, ResourceAssignment.region_code)

    # ── BOE Reports ───────────────────────────────────────────

    def boe_detailed(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        q = self._base_assignment_query(filters)
        rows = (
            q.with_entities(
                WBS.wbs_code, WBS.title.label("wbs_title"), WBS.approval_status,
                WBS.assumptions,
                ResourceAssignment.resource_code,
                ResourceAssignment.cost_type_code,
                ResourceAssignment.estimating_technique_code,
                ResourceAssignment.best_estimate,
                ResourceAssignment.likely_estimate,
                ResourceAssignment.worst_estimate,
            )
            .order_by(WBS.wbs_code, ResourceAssignment.resource_code)
            .all()
        )
        return [
            {
                "wbs_code": r.wbs_code or "",
                "wbs_title": r.wbs_title or "",
                "cost_type": r.cost_type_code or "",
                "technique": r.estimating_technique_code or "",
                "resource_code": r.resource_code or "",
                "best_estimate": float(r.best_estimate or 0),
                "likely_estimate": float(r.likely_estimate or 0),
                "worst_estimate": float(r.worst_estimate or 0),
                "pert_estimate": round(float((r.best_estimate or 0) + 4 * float(r.likely_estimate or 0) + float(r.worst_estimate or 0)) / 6, 2),
                "assumptions": r.assumptions or "",
                "approval_status": r.approval_status or "draft",
            }
            for r in rows
        ]

    def boe_summary(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        return self.cost_by_wbs(filters)

    # ── Risk Reports ──────────────────────────────────────────

    def risk_assessment(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        q = (
            self.db.query(Risk)
            .join(WBS, Risk.wbs_id == WBS.id)
            .filter(WBS.project_id == filters.project_id)
        )
        if filters.wbs_ids:
            q = q.filter(WBS.id.in_(filters.wbs_ids))

        rows = q.with_entities(
            WBS.wbs_code, WBS.title.label("wbs_title"),
            Risk.title.label("risk_title"), Risk.category_code,
            Risk.probability_code, Risk.severity_code,
            Risk.estimated_cost, Risk.mitigation_plan, Risk.status,
        ).order_by(WBS.wbs_code).all()

        results = []
        for r in rows:
            prob_weight = self._get_weight(ProbabilityLevel, r.probability_code)
            sev_weight = self._get_weight(SeverityLevel, r.severity_code)
            exposure = float(r.estimated_cost or 0) * prob_weight * sev_weight
            results.append({
                "wbs_code": r.wbs_code or "",
                "wbs_title": r.wbs_title or "",
                "risk_title": r.risk_title or "",
                "category": r.category_code or "",
                "probability": r.probability_code or "",
                "severity": r.severity_code or "",
                "exposure": round(exposure, 2),
                "mitigation": r.mitigation_plan or "",
                "status": r.status or "open",
            })
        return results

    def risk_summary(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        """Risk summary grouped by category."""
        risks = self.risk_assessment(filters)
        by_cat: Dict[str, Dict] = {}
        for r in risks:
            cat = r["category"] or "Uncategorized"
            if cat not in by_cat:
                by_cat[cat] = {"group_key": cat, "group_label": cat, "risk_count": 0, "total_exposure": 0}
            by_cat[cat]["risk_count"] += 1
            by_cat[cat]["total_exposure"] += r["exposure"]
        return sorted(by_cat.values(), key=lambda x: x["total_exposure"], reverse=True)

    # ── Audit Reports ─────────────────────────────────────────

    def audit_log_query(self, filters: ReportFilter, action_filter: Optional[str] = None,
                        entity_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        q = self.db.query(AuditLog)
        if filters.date_from:
            q = q.filter(AuditLog.created_at >= datetime.combine(filters.date_from, datetime.min.time()))
        if filters.date_to:
            q = q.filter(AuditLog.created_at <= datetime.combine(filters.date_to, datetime.max.time()))
        if action_filter:
            q = q.filter(AuditLog.action == action_filter)
        if entity_filter:
            q = q.filter(AuditLog.entity_type == entity_filter)

        rows = q.order_by(AuditLog.created_at.desc()).limit(1000).all()
        return [
            {
                "timestamp": r.created_at.isoformat() if r.created_at else "",
                "user_id": r.user_id,
                "action": r.action or "",
                "entity_type": r.entity_type or "",
                "entity_id": r.entity_id,
                "details": str(r.new_values or r.old_values or ""),
            }
            for r in rows
        ]

    # ── Resource Utilization ──────────────────────────────────

    def resource_utilization(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        q = self._base_assignment_query(filters)
        rows = (
            q.with_entities(
                ResourceAssignment.resource_code,
                func.count(ResourceAssignment.id).label("assignment_count"),
                func.count(func.distinct(ResourceAssignment.wbs_id)).label("wbs_count"),
                func.sum(ResourceAssignment.likely_estimate).label("total_likely"),
            )
            .group_by(ResourceAssignment.resource_code)
            .order_by(func.sum(ResourceAssignment.likely_estimate).desc())
            .all()
        )
        return [
            {
                "group_key": r.resource_code,
                "group_label": r.resource_code,
                "assignment_count": r.assignment_count,
                "wbs_count": r.wbs_count,
                "total_likely": round(float(r.total_likely or 0), 2),
            }
            for r in rows
        ]

    # ── Project Summary ───────────────────────────────────────

    def project_summary(self, filters: ReportFilter) -> List[Dict[str, Any]]:
        project = self.db.query(Project).filter(Project.id == filters.project_id).first()
        if not project:
            return []

        wbs_count = self.db.query(func.count(WBS.id)).filter(WBS.project_id == filters.project_id).scalar() or 0
        assignment_count = (
            self.db.query(func.count(ResourceAssignment.id))
            .join(WBS, ResourceAssignment.wbs_id == WBS.id)
            .filter(WBS.project_id == filters.project_id).scalar() or 0
        )
        risk_count = (
            self.db.query(func.count(Risk.id))
            .join(WBS, Risk.wbs_id == WBS.id)
            .filter(WBS.project_id == filters.project_id).scalar() or 0
        )

        cost_data = self.cost_by_wbs(filters)
        total_pert = sum(r["pert_total"] for r in cost_data)
        total_std = math.sqrt(sum(r["std_dev"] ** 2 for r in cost_data)) if cost_data else 0

        return [{
            "group_key": "summary",
            "group_label": project.project_name,
            "project_manager": project.project_manager or "",
            "status": project.status or "",
            "wbs_count": wbs_count,
            "assignment_count": assignment_count,
            "risk_count": risk_count,
            "total_pert": round(total_pert, 2),
            "combined_std_dev": round(total_std, 2),
            "confidence_80_low": round(total_pert - Z_80 * total_std, 2),
            "confidence_80_high": round(total_pert + Z_80 * total_std, 2),
        }]

    # ── Report Job CRUD ───────────────────────────────────────

    def create_job(self, user_id: int, report_type: str, parameters: dict,
                   output_format: str) -> ReportJob:
        job = ReportJob(user_id=user_id, report_type=report_type,
                        parameters=parameters, output_format=output_format, status="pending")
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def update_job(self, job_id: int, **kwargs) -> Optional[ReportJob]:
        job = self.db.query(ReportJob).filter(ReportJob.id == job_id).first()
        if not job:
            return None
        for k, v in kwargs.items():
            if hasattr(job, k):
                setattr(job, k, v)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_job(self, job_id: int) -> Optional[ReportJob]:
        return self.db.query(ReportJob).filter(ReportJob.id == job_id).first()

    def list_jobs(self, user_id: int, skip: int = 0, limit: int = 20) -> List[ReportJob]:
        return (self.db.query(ReportJob).filter(ReportJob.user_id == user_id)
                .order_by(ReportJob.created_at.desc()).offset(skip).limit(limit).all())

    def count_jobs(self, user_id: int) -> int:
        return self.db.query(func.count(ReportJob.id)).filter(ReportJob.user_id == user_id).scalar() or 0

    # ── Helpers ───────────────────────────────────────────────

    def _get_weight(self, model, code: Optional[str]) -> float:
        if not code:
            return 0.0
        row = self.db.query(model).filter(model.code == code).first()
        return float(row.weight) if row else 0.0

    def get_project_name(self, project_id: int) -> str:
        p = self.db.query(Project).filter(Project.id == project_id).first()
        return p.project_name if p else f"Project {project_id}"
