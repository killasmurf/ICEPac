"""WBS (Work Breakdown Structure) schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WBSResponse(BaseModel):
    """Flat WBS item response."""
    id: int
    project_id: int
    task_unique_id: Optional[int] = None
    wbs_code: Optional[str] = None
    wbs_title: str
    outline_level: int = 0
    parent_id: Optional[int] = None

    # Schedule dates
    schedule_start: Optional[datetime] = None
    schedule_finish: Optional[datetime] = None
    baseline_start: Optional[datetime] = None
    baseline_finish: Optional[datetime] = None
    late_start: Optional[datetime] = None
    late_finish: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_finish: Optional[datetime] = None

    # Duration
    duration: Optional[float] = None
    duration_units: Optional[str] = None

    # Progress & cost
    percent_complete: Optional[float] = 0.0
    cost: Optional[float] = None
    baseline_cost: Optional[float] = None

    # Flags
    is_milestone: bool = False
    is_summary: bool = False
    is_critical: bool = False

    # Display
    resource_names: Optional[str] = None
    notes: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WBSTreeNode(WBSResponse):
    """WBS item with nested children for tree display."""
    children: list["WBSTreeNode"] = []


class WBSListResponse(BaseModel):
    """Flat paginated WBS list."""
    items: list[WBSResponse]
    total: int
    skip: int
    limit: int


class WBSTreeResponse(BaseModel):
    """Hierarchical WBS tree."""
    items: list[WBSTreeNode]
    total: int
