from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# SQLAlchemy ORM Models
class Project(Base):
    __tablename__ = "projects"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    name = Column(String(255), nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)
    s3_key = Column(String(1000), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    finish_date = Column(DateTime(timezone=True), nullable=True)
    duration_days = Column(Float, nullable=True)
    completion_percent = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    resources = relationship("Resource", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, nullable=True)
    name = Column(String(500), nullable=False)
    duration_days = Column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    finish_date = Column(DateTime(timezone=True), nullable=True)
    completion_percent = Column(Float, default=0.0)
    priority = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    is_milestone = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="tasks")
    assignments = relationship("ResourceAssignment", back_populates="task", cascade="all, delete-orphan")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    type = Column(String(50), nullable=True)
    max_units = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="resources")
    assignments = relationship("ResourceAssignment", back_populates="resource", cascade="all, delete-orphan")


class ResourceAssignment(Base):
    __tablename__ = "resource_assignments"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4, index=True)
    task_id = Column(PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(PGUUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    units = Column(Float, nullable=True)
    work_hours = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("Task", back_populates="assignments")
    resource = relationship("Resource", back_populates="assignments")


# Pydantic Schemas for API
class ResourceAssignmentBase(BaseModel):
    units: Optional[float] = None
    work_hours: Optional[float] = None


class ResourceAssignmentCreate(ResourceAssignmentBase):
    resource_id: UUID


class ResourceAssignmentResponse(ResourceAssignmentBase):
    id: UUID
    task_id: UUID
    resource_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    task_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=500)
    duration_days: Optional[float] = None
    start_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    completion_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    priority: Optional[int] = None
    notes: Optional[str] = None
    is_milestone: bool = False


class TaskCreate(TaskBase):
    pass


class TaskResponse(TaskBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    assignments: List[ResourceAssignmentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ResourceBase(BaseModel):
    resource_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    type: Optional[str] = Field(None, max_length=50)
    max_units: Optional[float] = None


class ResourceCreate(ResourceBase):
    pass


class ResourceResponse(ResourceBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_name: str = Field(..., min_length=1, max_length=500)
    file_type: str = Field(..., pattern=r"^(mpp|mpx|xml)$")
    start_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    duration_days: Optional[float] = None
    completion_percent: float = Field(default=0.0, ge=0.0, le=100.0)


class ProjectCreate(ProjectBase):
    tasks: List[TaskCreate] = []
    resources: List[ResourceCreate] = []


class ProjectResponse(ProjectBase):
    id: UUID
    s3_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    tasks: List[TaskResponse] = []
    resources: List[ResourceResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProjectSummary(BaseModel):
    id: UUID
    name: str
    file_name: str
    file_type: str
    completion_percent: float
    task_count: int = 0
    resource_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadResponse(BaseModel):
    project_id: UUID
    message: str
    project: ProjectResponse
