"""Risk schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class RiskBase(BaseModel):
    """Base schema for risk data."""

    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None


class RiskCreate(RiskBase):
    """Schema for creating a new risk."""

    pass


class RiskUpdate(BaseModel):
    """Schema for updating a risk. All fields optional."""

    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Optional[Decimal] = Field(default=None, ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None


class RiskResponse(RiskBase):
    """Schema for risk response with computed fields."""

    id: int
    wbs_id: int
    date_identified: datetime

    # Computed field: risk_cost * probability_weight * severity_weight
    # This is computed in the service layer, not a model property
    risk_exposure: Optional[float] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RiskListResponse(BaseModel):
    """Schema for paginated list of risks."""

    items: list[RiskResponse]
    total: int
