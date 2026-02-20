"""Schemas for resource assignments, risks, and estimate summaries."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Resource Assignment Schemas
# ---------------------------------------------------------------------------

class AssignmentBase(BaseModel):
    resource_code: str = Field(max_length=50)
    supplier_code: Optional[str] = Field(default=None, max_length=50)
    cost_type_code: Optional[str] = Field(default=None, max_length=50)
    region_code: Optional[str] = Field(default=None, max_length=50)
    bus_area_code: Optional[str] = Field(default=None, max_length=50)
    estimating_technique_code: Optional[str] = Field(default=None, max_length=50)
    best_estimate: Decimal = Field(default=Decimal("0"), ge=0)
    likely_estimate: Decimal = Field(default=Decimal("0"), ge=0)
    worst_estimate: Decimal = Field(default=Decimal("0"), ge=0)
    duty_pct: Decimal = Field(default=Decimal("100"), ge=0, le=100)
    import_content_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    aii_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    supplier_code: Optional[str] = Field(default=None, max_length=50)
    cost_type_code: Optional[str] = Field(default=None, max_length=50)
    region_code: Optional[str] = Field(default=None, max_length=50)
    bus_area_code: Optional[str] = Field(default=None, max_length=50)
    estimating_technique_code: Optional[str] = Field(default=None, max_length=50)
    best_estimate: Optional[Decimal] = Field(default=None, ge=0)
    likely_estimate: Optional[Decimal] = Field(default=None, ge=0)
    worst_estimate: Optional[Decimal] = Field(default=None, ge=0)
    duty_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    import_content_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    aii_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)


class AssignmentResponse(AssignmentBase):
    id: int
    wbs_id: int
    pert_estimate: float
    std_deviation: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignmentListResponse(BaseModel):
    items: List[AssignmentResponse]
    total: int


# ---------------------------------------------------------------------------
# Risk Schemas
# ---------------------------------------------------------------------------

class RiskBase(BaseModel):
    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Decimal = Field(default=Decimal("0"), ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None
    date_identified: Optional[datetime] = None


class RiskCreate(RiskBase):
    pass


class RiskUpdate(BaseModel):
    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Optional[Decimal] = Field(default=None, ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None
    date_identified: Optional[datetime] = None


class RiskResponse(RiskBase):
    id: int
    wbs_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RiskListResponse(BaseModel):
    items: List[RiskResponse]
    total: int


# ---------------------------------------------------------------------------
# Estimate Summary Schemas
# ---------------------------------------------------------------------------

class WBSEstimateSummary(BaseModel):
    """PERT totals for a single WBS item."""
    wbs_id: int
    wbs_title: str
    wbs_code: Optional[str] = None
    assignment_count: int
    total_best: Decimal
    total_likely: Decimal
    total_worst: Decimal
    total_pert: float
    total_std_deviation: float
    risk_count: int
    total_risk_cost: Decimal


class ProjectEstimateSummary(BaseModel):
    """Roll-up of all WBS estimates for a project."""
    project_id: int
    project_name: str
    wbs_count: int
    total_best: Decimal
    total_likely: Decimal
    total_worst: Decimal
    total_pert: float
    total_std_deviation: float
    total_risk_cost: Decimal
    wbs_summaries: List[WBSEstimateSummary] = []
