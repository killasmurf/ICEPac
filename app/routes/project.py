from fastapi import APIRouter, UploadFile, File, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID
import logging

from app.services.mpp_reader import MPPReader
from app.services.s3_service import s3_service
from app.database import get_db
from app.models.project import (
    Project, Task, Resource, ResourceAssignment,
    ProjectResponse, ProjectSummary, UploadResponse,
    TaskCreate, ResourceCreate
)
from app.utils.validators import validate_project_file
from app.exceptions import (
    ProjectNotFoundException,
    FileProcessingException,
    S3UploadException,
    DatabaseException
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=UploadResponse)
async def upload_project_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and parse a Microsoft Project file

    Saves file to S3 and stores project data in database
    """
    # Validate file
    filename, file_type = validate_project_file(file)
    logger.info(f"Uploading project file: {filename}")

    try:
        # Read file contents
        contents = await file.read()

        # Parse project file
        reader = MPPReader()
        project_data = reader.parse(contents, filename)
        logger.info(f"Parsed project: {project_data.get('name', 'Unknown')}")

        # Create database project entry
        db_project = Project(
            name=project_data.get("name", filename),
            file_name=filename,
            file_type=file_type,
            start_date=project_data.get("start_date"),
            finish_date=project_data.get("finish_date"),
            duration_days=project_data.get("duration"),
            completion_percent=project_data.get("percent_complete", 0.0)
        )
        db.add(db_project)
        await db.flush()  # Get the project ID

        # Upload to S3
        s3_key = s3_service.generate_s3_key(db_project.id, filename)
        upload_success = await s3_service.upload_file(
            file_content=contents,
            s3_key=s3_key,
            content_type=file.content_type or "application/octet-stream"
        )

        if upload_success:
            db_project.s3_key = s3_key
            logger.info(f"Uploaded file to S3: {s3_key}")
        else:
            logger.warning(f"Failed to upload file to S3, continuing with database save")

        # Save tasks
        for task_data in project_data.get("tasks", []):
            db_task = Task(
                project_id=db_project.id,
                task_id=task_data.get("id"),
                name=task_data.get("name", "Unnamed Task"),
                duration_days=task_data.get("duration"),
                start_date=task_data.get("start"),
                finish_date=task_data.get("finish"),
                completion_percent=task_data.get("percent_complete", 0.0),
                notes=task_data.get("notes")
            )
            db.add(db_task)

        # Save resources
        for resource_data in project_data.get("resources", []):
            db_resource = Resource(
                project_id=db_project.id,
                resource_id=resource_data.get("id"),
                name=resource_data.get("name", "Unnamed Resource"),
                email=resource_data.get("email_address"),
                type=resource_data.get("type")
            )
            db.add(db_resource)

        await db.commit()
        await db.refresh(db_project)

        logger.info(f"Successfully created project {db_project.id}")

        # Fetch complete project with relationships
        result = await db.execute(
            select(Project).where(Project.id == db_project.id)
        )
        project = result.scalar_one()

        return UploadResponse(
            project_id=project.id,
            message="Project uploaded and processed successfully",
            project=ProjectResponse.model_validate(project)
        )

    except Exception as e:
        logger.error(f"Error processing project file: {e}", exc_info=True)
        await db.rollback()
        raise FileProcessingException(str(e), filename)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve project data by ID"""
    logger.info(f"Fetching project: {project_id}")

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise ProjectNotFoundException(str(project_id))

    return ProjectResponse.model_validate(project)


@router.get("/projects", response_model=List[ProjectSummary])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """List all projects with pagination"""
    logger.info(f"Listing projects: skip={skip}, limit={limit}")

    # Get projects with task/resource counts
    result = await db.execute(
        select(Project)
        .offset(skip)
        .limit(limit)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    # Build summaries
    summaries = []
    for project in projects:
        summary = ProjectSummary(
            id=project.id,
            name=project.name,
            file_name=project.file_name,
            file_type=project.file_type,
            completion_percent=project.completion_percent,
            task_count=len(project.tasks),
            resource_count=len(project.resources),
            created_at=project.created_at,
            updated_at=project.updated_at
        )
        summaries.append(summary)

    return summaries


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a project and its associated S3 file"""
    logger.info(f"Deleting project: {project_id}")

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise ProjectNotFoundException(str(project_id))

    # Delete from S3 if exists
    if project.s3_key:
        await s3_service.delete_file(project.s3_key)
        logger.info(f"Deleted S3 file: {project.s3_key}")

    # Delete from database (cascade will handle related records)
    await db.delete(project)
    await db.commit()

    logger.info(f"Successfully deleted project {project_id}")

    return {
        "message": "Project deleted successfully",
        "project_id": str(project_id)
    }