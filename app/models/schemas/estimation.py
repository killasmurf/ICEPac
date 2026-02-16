"""Estimation and approval workflow schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WBSCostSummary(BaseModel):
    """Cost summary for a single WBS item."""
    wbs_id: int
    wbs_code: Optional[str] = None
    wbs_title: str

    # Assignment aggregates
    assignment_count: int = 0
    total_pert_estimate: float = 0.0
    total_std_deviation: float = 0.0

    # Confidence intervals (80% using z=1.28)
    confidence_80_low: float = 0.0
    confidence_80_high: float = 0.0

    # Risk aggregates
    risk_count: int = 0
    total_risk_exposure: float = 0.0

    # Risk-adjusted estimate
    risk_adjusted_estimate: float = 0.0

    # Approval status
    approval_status: str = "draft"


class CostBreakdownItem(BaseModel):
    """Single item in a cost breakdown (by cost type, region, etc.)."""
    code: str
    description: str
    total_pert: float = 0.0
    assignment_count: int = 0


class SupplierBreakdownItem(BaseModel):
    """Single item in supplier breakdown."""
    code: str
    name: str
    total_pert: float = 0.0
    assignment_count: int = 0


class ProjectEstimationSummary(BaseModel):
    """Full project estimation summary with breakdowns."""
    project_id: int
    project_name: str

    # Totals
    total_wbs_items: int = 0
    total_assignments: int = 0
    total_pert_estimate: float = 0.0
    total_std_deviation: float = 0.0

    # Confidence intervals
    confidence_80_low: float = 0.0
    confidence_80_high: float = 0.0

    # Risks
    total_risks: int = 0
    total_risk_exposure: float = 0.0
    risk_adjusted_estimate: float = 0.0

    # Breakdowns
    by_cost_type: list[CostBreakdownItem] = []
    by_region: list[CostBreakdownItem] = []
    by_resource: list[CostBreakdownItem] = []
    by_supplier: list[SupplierBreakdownItem] = []

    # WBS-level summaries
    wbs_summaries: list[WBSCostSummary] = []


class ApprovalAction(BaseModel):
    """Schema for approval workflow actions."""
    action: str = Field(..., pattern="^(submit|approve|reject|reset)$")
    comment: Optional[str] = None


class WBSApprovalResponse(BaseModel):
    """Schema for WBS approval status response."""
    wbs_id: int
    approval_status: str
    approver: Optional[str] = None
    approver_date: Optional[datetime] = None
    estimate_revision: int = 0

    model_config = {"from_attributes": True}
