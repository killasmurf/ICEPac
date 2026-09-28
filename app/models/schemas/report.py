"""Report schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.database.report import ReportFormat, ReportStatus, ReportType


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    report_type: ReportType
    report_format: ReportFormat = ReportFormat.JSON
    title: Optional[str] = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ReportResponse(BaseModel):
    id: int
    project_id: int
    report_type: ReportType
    report_format: ReportFormat
    status: ReportStatus
    title: str
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int


# ---------------------------------------------------------------------------
# Report data schemas (inline JSON payload for JSON-format reports)
# ---------------------------------------------------------------------------

class CostControlLineItem(BaseModel):
    wbs_code: Optional[str] = None
    wbs_title: str
    assignment_count: int = 0
    best_estimate: float = 0.0
    likely_estimate: float = 0.0
    worst_estimate: float = 0.0
    pert_estimate: float = 0.0
    std_deviation: float = 0.0
    risk_exposure: float = 0.0
    risk_adjusted: float = 0.0
    approval_status: str = "draft"


class CostControlReport(BaseModel):
    project_id: int
    project_name: str
    generated_at: datetime
    total_pert: float = 0.0
    total_risk_exposure: float = 0.0
    total_risk_adjusted: float = 0.0
    confidence_80_low: float = 0.0
    confidence_80_high: float = 0.0
    line_items: List[CostControlLineItem] = []


class BOELineItem(BaseModel):
    wbs_code: Optional[str] = None
    wbs_title: str
    resource_code: str
    cost_type_code: Optional[str] = None
    estimating_technique_code: Optional[str] = None
    best_estimate: float = 0.0
    likely_estimate: float = 0.0
    worst_estimate: float = 0.0
    pert_estimate: float = 0.0
    rationale: Optional[str] = None


class BOEReport(BaseModel):
    project_id: int
    project_name: str
    generated_at: datetime
    total_pert: float = 0.0
    line_items: List[BOELineItem] = []


class RiskSummaryItem(BaseModel):
    wbs_code: Optional[str] = None
    wbs_title: str
    risk_count: int = 0
    total_exposure: float = 0.0
    max_exposure: float = 0.0


class RiskSummaryReport(BaseModel):
    project_id: int
    project_name: str
    generated_at: datetime
    total_risks: int = 0
    total_exposure: float = 0.0
    items: List[RiskSummaryItem] = []


class WBSSummaryReport(BaseModel):
    project_id: int
    project_name: str
    generated_at: datetime
    wbs_count: int = 0
    assignment_count: int = 0
    total_pert: float = 0.0
    by_cost_type: list = []
    by_region: list = []
    by_resource: list = []
