"""Import job schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ImportJobResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    filename: str
    s3_key: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    progress: float
    celery_task_id: Optional[str] = None
    task_count: int = 0
    resource_count: int = 0
    assignment_count: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ImportJobListResponse(BaseModel):
    items: list[ImportJobResponse]
    total: int


class ImportStartResponse(BaseModel):
    job_id: int
    status: str
    message: str
