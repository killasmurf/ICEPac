"""Report generation engine - orchestrates query, formatting, and export."""
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.repositories.report_repository import ReportRepository
from app.models.schemas.report import (
    ReportRequest, ReportResult, ReportFilter, ReportType, ExportFormat, REPORT_CATALOG,
)


# Column definitions per report type
REPORT_COLUMNS = {
    ReportType.COST_BY_WBS: [
        {"key": "group_label", "label": "WBS Item"},
        {"key": "best_total", "label": "Best ($)"},
        {"key": "likely_total", "label": "Likely ($)"},
        {"key": "worst_total", "label": "Worst ($)"},
        {"key": "pert_total", "label": "PERT ($)"},
        {"key": "std_dev", "label": "Std Dev"},
        {"key": "confidence_80_low", "label": "80% Low"},
        {"key": "confidence_80_high", "label": "80% High"},
        {"key": "assignment_count", "label": "Assignments"},
    ],
    ReportType.BOE_DETAILED: [
        {"key": "wbs_code", "label": "WBS Code"},
        {"key": "wbs_title", "label": "WBS Title"},
        {"key": "resource_code", "label": "Resource"},
        {"key": "cost_type", "label": "Cost Type"},
        {"key": "technique", "label": "Technique"},
        {"key": "best_estimate", "label": "Best ($)"},
        {"key": "likely_estimate", "label": "Likely ($)"},
        {"key": "worst_estimate", "label": "Worst ($)"},
        {"key": "pert_estimate", "label": "PERT ($)"},
        {"key": "approval_status", "label": "Status"},
    ],
    ReportType.RISK_ASSESSMENT: [
        {"key": "wbs_code", "label": "WBS Code"},
        {"key": "wbs_title", "label": "WBS Title"},
        {"key": "risk_title", "label": "Risk"},
        {"key": "category", "label": "Category"},
        {"key": "probability", "label": "Probability"},
        {"key": "severity", "label": "Severity"},
        {"key": "exposure", "label": "Exposure ($)"},
        {"key": "mitigation", "label": "Mitigation"},
    ],
    ReportType.CHANGE_HISTORY: [
        {"key": "timestamp", "label": "Date/Time"},
        {"key": "user_id", "label": "User"},
        {"key": "action", "label": "Action"},
        {"key": "entity_type", "label": "Entity"},
        {"key": "entity_id", "label": "ID"},
        {"key": "details", "label": "Details"},
    ],
    ReportType.RESOURCE_UTILIZATION: [
        {"key": "group_label", "label": "Resource"},
        {"key": "assignment_count", "label": "Assignments"},
        {"key": "wbs_count", "label": "WBS Items"},
        {"key": "total_likely", "label": "Total Likely ($)"},
    ],
    ReportType.PROJECT_SUMMARY: [
        {"key": "group_label", "label": "Project"},
        {"key": "project_manager", "label": "Manager"},
        {"key": "wbs_count", "label": "WBS Items"},
        {"key": "assignment_count", "label": "Assignments"},
        {"key": "risk_count", "label": "Risks"},
        {"key": "total_pert", "label": "Total PERT ($)"},
        {"key": "confidence_80_low", "label": "80% Low ($)"},
        {"key": "confidence_80_high", "label": "80% High ($)"},
    ],
}

# Default cost columns for generic cost reports
_COST_COLUMNS = REPORT_COLUMNS[ReportType.COST_BY_WBS]
for rt in [ReportType.COST_BY_RESOURCE, ReportType.COST_BY_SUPPLIER,
           ReportType.COST_BY_EOC, ReportType.COST_BY_TECHNIQUE,
           ReportType.COST_BY_REGION, ReportType.BOE_SUMMARY, ReportType.BOE_BY_WBS]:
    REPORT_COLUMNS[rt] = _COST_COLUMNS

for rt in [ReportType.RISK_SUMMARY]:
    REPORT_COLUMNS[rt] = [
        {"key": "group_label", "label": "Category"},
        {"key": "risk_count", "label": "Risks"},
        {"key": "total_exposure", "label": "Total Exposure ($)"},
    ]

for rt in [ReportType.ESTIMATOR_ACTIVITY, ReportType.APPROVER_ACTIVITY]:
    REPORT_COLUMNS[rt] = REPORT_COLUMNS[ReportType.CHANGE_HISTORY]


# Report type → repository method mapping
REPORT_HANDLERS = {
    ReportType.COST_BY_WBS: "cost_by_wbs",
    ReportType.COST_BY_RESOURCE: "cost_by_resource",
    ReportType.COST_BY_SUPPLIER: "cost_by_supplier",
    ReportType.COST_BY_EOC: "cost_by_eoc",
    ReportType.COST_BY_TECHNIQUE: "cost_by_technique",
    ReportType.COST_BY_REGION: "cost_by_region",
    ReportType.BOE_SUMMARY: "boe_summary",
    ReportType.BOE_DETAILED: "boe_detailed",
    ReportType.BOE_BY_WBS: "cost_by_wbs",
    ReportType.RISK_ASSESSMENT: "risk_assessment",
    ReportType.RISK_SUMMARY: "risk_summary",
    ReportType.RESOURCE_UTILIZATION: "resource_utilization",
    ReportType.PROJECT_SUMMARY: "project_summary",
}

AUDIT_HANDLERS = {
    ReportType.ESTIMATOR_ACTIVITY: ("UPDATE", "resource_assignment"),
    ReportType.APPROVER_ACTIVITY: ("UPDATE", "wbs"),
    ReportType.CHANGE_HISTORY: (None, None),
}

# Friendly titles
REPORT_TITLES = {rt.value: next(
    (r["label"] for cat in REPORT_CATALOG.values() for r in cat["reports"] if r["type"] == rt.value),
    rt.value.replace("_", " ").title()
) for rt in ReportType}


class ReportEngine:
    """Orchestrates report generation."""

    def __init__(self, db: Session):
        self.repo = ReportRepository(db)

    def generate(self, request: ReportRequest) -> ReportResult:
        """Generate a report and return structured result."""
        rt = request.report_type
        filters = request.filters
        project_name = self.repo.get_project_name(filters.project_id)
        title = request.title or REPORT_TITLES.get(rt.value, rt.value)

        # Dispatch to appropriate handler
        if rt in AUDIT_HANDLERS:
            action_filter, entity_filter = AUDIT_HANDLERS[rt]
            rows = self.repo.audit_log_query(filters, action_filter, entity_filter)
        elif rt in REPORT_HANDLERS:
            handler = getattr(self.repo, REPORT_HANDLERS[rt])
            rows = handler(filters)
        else:
            rows = []

        # Compute totals for cost reports
        totals = None
        numeric_keys = {"best_total", "likely_total", "worst_total", "pert_total",
                        "std_dev", "confidence_80_low", "confidence_80_high",
                        "assignment_count", "total_exposure", "risk_count", "exposure",
                        "total_likely", "wbs_count"}
        if rows:
            totals = {}
            for key in rows[0]:
                if key in numeric_keys:
                    totals[key] = round(sum(r.get(key, 0) for r in rows), 2)

        columns = REPORT_COLUMNS.get(rt, [{"key": "group_label", "label": "Item"}])

        return ReportResult(
            report_type=rt.value,
            title=title,
            generated_at=datetime.utcnow(),
            project_name=project_name,
            filters_applied=filters.dict(exclude_none=True),
            columns=columns,
            rows=rows,
            totals=totals,
            row_count=len(rows),
            metadata={"report_catalog_category": self._get_category(rt)},
        )

    def get_catalog(self) -> Dict[str, Any]:
        """Return the full report catalog."""
        return REPORT_CATALOG

    @staticmethod
    def _get_category(rt: ReportType) -> str:
        for cat_key, cat in REPORT_CATALOG.items():
            for r in cat["reports"]:
                if r["type"] == rt.value:
                    return cat_key
        return "other"
