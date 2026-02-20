"""Project and WBS schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# WBS Schemas
# ---------------------------------------------------------------------------

class WBSBase(BaseModel):
    wbs_code: Optional[str] = Field(default=None, max_length=100)
    wbs_title: str = Field(min_length=1, max_length=500)
    schedule_start: Optional[datetime] = None
    schedule_finish: Optional[datetime] = None
    baseline_start: Optional[datetime] = None
    baseline_finish: Optional[datetime] = None
    requirements: Optional[str] = None
    assumptions: Optional[str] = None


class WBSCreate(WBSBase):
    task_unique_id: Optional[int] = None


class WBSUpdate(BaseModel):
    wbs_code: Optional[str] = Field(default=None, max_length=100)
    wbs_title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    schedule_start: Optional[datetime] = None
    schedule_finish: Optional[datetime] = None
    baseline_start: Optional[datetime] = None
    baseline_finish: Optional[datetime] = None
    requirements: Optional[str] = None
    assumptions: Optional[str] = None
    approver: Optional[str] = None
    approver_date: Optional[datetime] = None


class WBSResponse(WBSBase):
    id: int
    project_id: int
    task_unique_id: Optional[int] = None
    cost: Optional[Decimal] = None
    baseline_cost: Optional[Decimal] = None
    approver: Optional[str] = None
    approver_date: Optional[datetime] = None
    estimate_revision: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WBSListResponse(BaseModel):
    items: List[WBSResponse]
    total: int
    skip: int
    limit: int


# ---------------------------------------------------------------------------
# Project Schemas
# ---------------------------------------------------------------------------

class ProjectBase(BaseModel):
    project_name: str = Field(min_length=1, max_length=255)
    project_manager: Optional[str] = None
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    project_manager: Optional[str] = None
    description: Optional[str] = None
    archived: Optional[bool] = None


class ProjectResponse(ProjectBase):
    id: int
    archived: bool
    created_at: datetime
    updated_at: datetime
    wbs_count: int = 0

    model_config = {"from_attributes": True}


class ProjectDetailResponse(ProjectResponse):
    """Project with embedded WBS items."""
    wbs_items: List[WBSResponse] = []


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
    skip: int
    limit: int


# ---------------------------------------------------------------------------
# Upload response
# ---------------------------------------------------------------------------

class MPPUploadResponse(BaseModel):
    project_id: int
    project_name: str
    wbs_items_imported: int
    message: str
