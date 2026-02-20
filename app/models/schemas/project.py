"""Project schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


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
    status: Optional[str] = None
    source_file: Optional[str] = None
    source_format: Optional[str] = None
    start_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    baseline_start: Optional[datetime] = None
    baseline_finish: Optional[datetime] = None
    task_count: int = 0
    resource_count: int = 0
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    skip: int
    limit: int
