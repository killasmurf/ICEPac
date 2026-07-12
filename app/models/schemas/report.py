"""Report Pydantic schemas for request validation and response serialization."""
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ReportType(str, Enum):
    COST_BY_WBS = "cost_by_wbs"
    COST_BY_RESOURCE = "cost_by_resource"
    COST_BY_SUPPLIER = "cost_by_supplier"
    COST_BY_EOC = "cost_by_eoc"
    COST_BY_TECHNIQUE = "cost_by_technique"
    COST_BY_REGION = "cost_by_region"
    BOE_SUMMARY = "boe_summary"
    BOE_DETAILED = "boe_detailed"
    BOE_BY_WBS = "boe_by_wbs"
    RISK_ASSESSMENT = "risk_assessment"
    RISK_SUMMARY = "risk_summary"
    ESTIMATOR_ACTIVITY = "estimator_activity"
    APPROVER_ACTIVITY = "approver_activity"
    CHANGE_HISTORY = "change_history"
    RESOURCE_UTILIZATION = "resource_utilization"
    PROJECT_SUMMARY = "project_summary"


class ExportFormat(str, Enum):
    JSON = "json"
    PDF = "pdf"
    XLSX = "xlsx"
    DOCX = "docx"
    CSV = "csv"


REPORT_CATALOG = {
    "cost_control": {
        "label": "Cost Control Reports",
        "reports": [
            {
                "type": "cost_by_wbs",
                "label": "Cost by WBS",
                "description": "Cost rollup by Work Breakdown Structure",
            },
            {
                "type": "cost_by_resource",
                "label": "Cost by Resource",
                "description": "Cost breakdown by resource code",
            },
            {
                "type": "cost_by_supplier",
                "label": "Cost by Supplier",
                "description": "Cost breakdown by supplier",
            },
            {
                "type": "cost_by_eoc",
                "label": "Cost by EOC",
                "description": "Cost by Element of Cost category",
            },
            {
                "type": "cost_by_technique",
                "label": "Cost by Technique",
                "description": "Cost by estimating technique",
            },
            {
                "type": "cost_by_region",
                "label": "Cost by Region",
                "description": "Cost breakdown by geographic region",
            },
        ],
    },
    "boe": {
        "label": "Basis of Estimate",
        "reports": [
            {
                "type": "boe_summary",
                "label": "BOE Summary",
                "description": "High-level estimation basis summary",
            },
            {
                "type": "boe_detailed",
                "label": "BOE Detailed",
                "description": "Detailed estimation basis with methodology",
            },
            {
                "type": "boe_by_wbs",
                "label": "BOE by WBS",
                "description": "Basis of estimate per WBS item",
            },
        ],
    },
    "risk": {
        "label": "Risk Reports",
        "reports": [
            {
                "type": "risk_assessment",
                "label": "Risk Assessment",
                "description": "Full risk assessment with probability/severity",
            },
            {
                "type": "risk_summary",
                "label": "Risk Summary",
                "description": "Risk summary with exposure totals",
            },
        ],
    },
    "audit": {
        "label": "Audit Reports",
        "reports": [
            {
                "type": "estimator_activity",
                "label": "Estimator Activity",
                "description": "Activity log for estimators",
            },
            {
                "type": "approver_activity",
                "label": "Approver Activity",
                "description": "Approval decisions and history",
            },
            {
                "type": "change_history",
                "label": "Change History",
                "description": "All changes to project estimates",
            },
        ],
    },
    "utilization": {
        "label": "Utilization Reports",
        "reports": [
            {
                "type": "resource_utilization",
                "label": "Resource Utilization",
                "description": "Resource allocation across projects",
            },
            {
                "type": "project_summary",
                "label": "Project Summary",
                "description": "Overall project status and metrics",
            },
        ],
    },
}


# ── Request Schemas ───────────────────────────────────────────


class ReportFilter(BaseModel):
    """Common filter parameters for all reports."""

    project_id: int
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    wbs_ids: Optional[List[int]] = None
    cost_type_codes: Optional[List[str]] = None
    region_codes: Optional[List[str]] = None
    resource_codes: Optional[List[str]] = None
    supplier_codes: Optional[List[str]] = None
    technique_codes: Optional[List[str]] = None
    include_inactive: bool = False
    approval_status: Optional[str] = None  # draft, submitted, approved


class ReportRequest(BaseModel):
    """Request to generate a report."""

    report_type: ReportType
    filters: ReportFilter
    export_format: ExportFormat = ExportFormat.JSON
    title: Optional[str] = None
    # NOTE: include_charts was removed in US-006/Phase 5. The field was
    # defined as a placeholder for a chart-generation feature that was
    # never implemented (the engine ignored it). It is now dropped from
    # the request schema. Callers sending include_charts will receive
    # a 422 from pydantic validation; the OpenAPI spec at /openapi.json
    # no longer advertises the field. To prevent silent surprise for
    # any caller still including the field, the API also accepts (and
    # ignores) the value with a DeprecationWarning logged server-side
    # for one release — removed in the next major version. See the
    # "Reports" help topic in /api/v1/help for the user-facing note.


# ── Response Schemas ──────────────────────────────────────────


class ReportRow(BaseModel):
    """Single row in a report result."""

    label: str
    values: Dict[str, Any]


class CostBreakdownRow(BaseModel):
    """Row in a cost breakdown report."""

    group_key: str
    group_label: str
    best_total: float = 0
    likely_total: float = 0
    worst_total: float = 0
    pert_total: float = 0
    std_dev: float = 0
    confidence_80_low: float = 0
    confidence_80_high: float = 0
    assignment_count: int = 0
    risk_exposure: float = 0


class BOERow(BaseModel):
    """Row in a Basis of Estimate report."""

    wbs_code: str
    wbs_title: str
    cost_type: Optional[str] = None
    technique: Optional[str] = None
    resource_code: Optional[str] = None
    resource_description: Optional[str] = None
    best_estimate: float = 0
    likely_estimate: float = 0
    worst_estimate: float = 0
    pert_estimate: float = 0
    assumptions: Optional[str] = None
    approval_status: str = "draft"


class RiskRow(BaseModel):
    """Row in a risk report."""

    wbs_code: str
    wbs_title: str
    risk_title: str
    category: Optional[str] = None
    probability: Optional[str] = None
    severity: Optional[str] = None
    exposure: float = 0
    mitigation: Optional[str] = None
    status: Optional[str] = None


class AuditRow(BaseModel):
    """Row in an audit report."""

    timestamp: datetime
    user: str
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None


class ReportResult(BaseModel):
    """Complete report result."""

    report_type: str
    title: str
    generated_at: datetime
    project_name: str
    filters_applied: Dict[str, Any]
    columns: List[Dict[str, str]]  # [{"key": "group_label", "label": "Category"}, ...]
    rows: List[Dict[str, Any]]
    totals: Optional[Dict[str, Any]] = None
    row_count: int = 0
    metadata: Optional[Dict[str, Any]] = None


class ReportJobResponse(BaseModel):
    """Response for async report job."""

    id: int
    report_type: str
    status: str
    output_format: str
    row_count: int = 0
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReportJobListResponse(BaseModel):
    items: List[ReportJobResponse]
    total: int
