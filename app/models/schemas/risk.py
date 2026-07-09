"""Risk schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RiskBase(BaseModel):
    """Shared fields for all risk schemas (WBS-scoped + project-scoped).

    title is required at the schema layer. The DB migration backfills
    placeholder titles for any pre-existing WBS-scoped rows so the NOT NULL
    constraint is satisfied for all current data.

    risk_exposure (probability × severity × cost) is computed in the service
    layer, not a model property.
    """

    title: str = Field(..., max_length=255)
    status: str = Field(default="open", max_length=32)
    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None
    date_identified: datetime = Field(default_factory=datetime.utcnow)
    risk_exposure: Optional[float] = None


class RiskCreate(RiskBase):
    """Schema for creating a new WBS-scoped risk. wbs_id comes from URL."""

    pass


class RiskUpdate(BaseModel):
    """Schema for updating a WBS-scoped risk. All fields optional."""

    title: Optional[str] = Field(default=None, max_length=255)
    status: Optional[str] = Field(default=None, max_length=32)
    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Optional[Decimal] = Field(default=None, ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None
    date_identified: Optional[datetime] = None


class RiskResponse(RiskBase):
    """Full risk response. Both wbs_id and project_id are optional in the
    response because a risk has exactly one of them set (XOR invariant)."""

    id: int
    wbs_id: Optional[int] = None
    project_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskListResponse(BaseModel):
    """Schema for paginated list of risks."""

    items: list[RiskResponse]
    total: int


# ---- Project-scoped risk schemas (separate because wbs_id is never set;
# project_id is locked to the URL and immutable post-create) ----


class ProjectRiskCreate(RiskBase):
    """Schema for creating a project-scoped risk. project_id comes from URL."""

    pass


class ProjectRiskUpdate(BaseModel):
    """Schema for updating a project-scoped risk. All fields optional.
    project_id cannot change (locked to the URL scope)."""

    title: Optional[str] = Field(default=None, max_length=255)
    status: Optional[str] = Field(default=None, max_length=32)
    risk_category_code: Optional[str] = Field(default=None, max_length=50)
    risk_cost: Optional[Decimal] = Field(default=None, ge=0)
    probability_code: Optional[str] = Field(default=None, max_length=50)
    severity_code: Optional[str] = Field(default=None, max_length=50)
    mitigation_plan: Optional[str] = None
    date_identified: Optional[datetime] = None


class ProjectRiskResponse(RiskBase):
    """Project-scoped risk response (wbs_id always null, project_id always set)."""

    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectRiskListResponse(BaseModel):
    """Paginated list of project-scoped risks."""

    items: list[ProjectRiskResponse]
    total: int
