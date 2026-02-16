"""Resource Assignment schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class AssignmentBase(BaseModel):
    """Base schema for assignment data."""
    resource_code: str = Field(..., min_length=1, max_length=50)
    supplier_code: Optional[str] = Field(default=None, max_length=50)
    cost_type_code: Optional[str] = Field(default=None, max_length=50)
    region_code: Optional[str] = Field(default=None, max_length=50)
    bus_area_code: Optional[str] = Field(default=None, max_length=50)
    estimating_technique_code: Optional[str] = Field(default=None, max_length=50)

    # Three-point estimation
    best_estimate: Decimal = Field(default=Decimal("0.00"), ge=0)
    likely_estimate: Decimal = Field(default=Decimal("0.00"), ge=0)
    worst_estimate: Decimal = Field(default=Decimal("0.00"), ge=0)

    # Tracking percentages
    duty_pct: Decimal = Field(default=Decimal("100.00"), ge=0, le=100)
    import_content_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    aii_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)


class AssignmentCreate(AssignmentBase):
    """Schema for creating a new assignment."""
    pass


class AssignmentUpdate(BaseModel):
    """Schema for updating an assignment. All fields optional."""
    resource_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
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
    """Schema for assignment response with computed fields."""
    id: int
    wbs_id: int

    # Computed fields (from model @property)
    pert_estimate: float
    std_deviation: float

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignmentListResponse(BaseModel):
    """Schema for paginated list of assignments."""
    items: list[AssignmentResponse]
    total: int
