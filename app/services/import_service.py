"""
Import service — orchestrates MS Project file import.

Handles file upload to S3, Celery task dispatch, file parsing,
WBS record creation, and import status tracking.
"""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.database.import_job import ImportJob, ImportStatus
from app.models.database.project import Project, ProjectSourceFormat, ProjectStatus
from app.models.database.wbs import WBS
from app.repositories.import_job_repository import ImportJobRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.wbs_repository import WBSRepository
from app.services.mpp_parser import MPPParser, ParsedProject
from app.utils.validators import get_content_type, sanitize_filename, validate_file

logger = logging.getLogger(__name__)


class ImportService:
    """Orchestrates MS Project file import lifecycle."""

    def __init__(self, db: Session):
        self.db = db
        self.import_repo = ImportJobRepository(db)
        self.wbs_repo = WBSRepository(db)
        self.project_repo = ProjectRepository(db)

    # ============================================================
    # Start import (called from API route)
    # ============================================================

    async def start_import(
        self,
        project_id: int,
        file: UploadFile,
        user_id: int,
    ) -> ImportJob:
        """
        Validate file, upload to S3, create ImportJob, dispatch Celery task.

        Returns the created ImportJob.
        """
        # 1. Validate project exists
        project = self.project_repo.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        # 2. Validate file
        file_contents = await file.read()
        filename = sanitize_filename(file.filename or "unknown.mpp")
        file_size = len(file_contents)

        is_valid, errors = validate_file(filename, file_size)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file: {'; '.join(errors)}",
            )

        # 3. Determine source format
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        format_map = {
            "mpp": ProjectSourceFormat.MPP,
            "mpx": ProjectSourceFormat.MPX,
            "xml": ProjectSourceFormat.XML,
        }
        source_format = format_map.get(ext, ProjectSourceFormat.MPP)

        # 4. Upload to S3
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        s3_key = f"projects/{project_id}/{timestamp}_{filename}"
        content_type = get_content_type(filename)

        from app.services.s3_service import s3_service

        upload_ok = await s3_service.upload_file(file_contents, s3_key, content_type)
        if not upload_ok:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file to storage",
            )

        # 5. Update project metadata
        self.project_repo.update(
            project,
            {
                "source_file": filename,
                "source_format": source_format,
                "s3_key": s3_key,
                "status": ProjectStatus.IMPORTING,
            },
        )

        # 6. Create ImportJob record
        job = self.import_repo.create(
            {
                "project_id": project_id,
                "user_id": user_id,
                "filename": filename,
                "s3_key": s3_key,
                "file_size": file_size,
                "status": ImportStatus.PENDING,
                "progress": 0.0,
            }
        )

        # 7. Dispatch Celery task
        from app.tasks.mpp_tasks import process_mpp_import

        result = process_mpp_import.delay(job.id)

        # Store Celery task ID
        self.import_repo.update(job, {"celery_task_id": result.id})

        logger.info(
            "Import started: job=%d, project=%d, file=%s", job.id, project_id, filename
        )
        return job

    # ============================================================
    # Process import (called from Celery worker)
    # ============================================================

    def process_import(self, job_id: int) -> None:
        """
        Download from S3, parse with MPPParser, create WBS records.

        Called by the Celery worker with its own DB session.
        """
        job = self.import_repo.get(job_id)
        if not job:
            logger.error("Import job %d not found", job_id)
            return

        project = self.project_repo.get(job.project_id)
        if not project:
            self._fail_job(job, "Project not found")
            return

        try:
            # Update status: started
            self._update_progress(
                job, ImportStatus.PARSING, 10, started_at=datetime.utcnow()
            )

            # Download file from S3
            self._update_progress(job, ImportStatus.PARSING, 15)
            file_contents = self._download_from_s3(job.s3_key)
            if file_contents is None:
                self._fail_job(job, "Failed to download file from S3")
                return

            # Parse with MPPParser
            self._update_progress(job, ImportStatus.PARSING, 20)
            parser = MPPParser()
            parsed = parser.parse(file_contents, job.filename)
            self._update_progress(job, ImportStatus.CREATING_RECORDS, 50)

            # Clear existing WBS for re-import
            self.wbs_repo.delete_by_project(job.project_id)

            # Create WBS records (two-pass for parent linking)
            self._create_wbs_records(job, project, parsed)

            # Update project metadata
            self.project_repo.update(
                project,
                {
                    "status": ProjectStatus.IMPORTED,
                    "start_date": parsed.start_date,
                    "finish_date": parsed.finish_date,
                    "baseline_start": parsed.baseline_start,
                    "baseline_finish": parsed.baseline_finish,
                    "task_count": len(parsed.tasks),
                    "resource_count": len(parsed.resources),
                },
            )

            # Mark job completed
            self._update_progress(
                job,
                ImportStatus.COMPLETED,
                100,
                completed_at=datetime.utcnow(),
                task_count=len(parsed.tasks),
                resource_count=len(parsed.resources),
                assignment_count=len(parsed.assignments),
            )

            logger.info(
                "Import completed: job=%d, tasks=%d, resources=%d, assignments=%d",
                job_id,
                len(parsed.tasks),
                len(parsed.resources),
                len(parsed.assignments),
            )

        except Exception as e:
            logger.exception("Import failed: job=%d", job_id)
            self._fail_job(job, str(e))
            self.project_repo.update(project, {"status": ProjectStatus.IMPORT_FAILED})

    # ============================================================
    # Status queries
    # ============================================================

    def get_import_status(self, job_id: int) -> Optional[ImportJob]:
        """Get a single import job by ID."""
        return self.import_repo.get(job_id)

    def get_project_imports(self, project_id: int) -> List[ImportJob]:
        """Get all import jobs for a project."""
        return self.import_repo.get_by_project(project_id)

    # ============================================================
    # Internal helpers
    # ============================================================

    def _download_from_s3(self, s3_key: str) -> Optional[bytes]:
        """Synchronous S3 download for Celery worker context."""
        import boto3

        try:
            session_kwargs = {"region_name": settings.AWS_REGION}
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                session_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                session_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            client = boto3.client("s3", **session_kwargs)
            response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
            return response["Body"].read()
        except Exception as e:
            logger.error("S3 download failed for %s: %s", s3_key, e)
            return None

    def _create_wbs_records(
        self, job: ImportJob, project: Project, parsed: ParsedProject
    ) -> None:
        """
        Two-pass WBS creation:
        1. Create all records (to get DB IDs)
        2. Link parent_id using unique_id -> db_id mapping
        """
        if not parsed.tasks:
            return

        # Pass 1: Create all WBS items without parent links
        unique_id_to_db_id = {}
        total = len(parsed.tasks)

        for i, task in enumerate(parsed.tasks):
            wbs_data = {
                "project_id": project.id,
                "task_unique_id": task.unique_id,
                "wbs_code": task.wbs_code,
                "wbs_title": task.name,
                "outline_level": task.outline_level,
                "schedule_start": task.start,
                "schedule_finish": task.finish,
                "baseline_start": task.baseline_start,
                "baseline_finish": task.baseline_finish,
                "late_start": task.late_start,
                "late_finish": task.late_finish,
                "actual_start": task.actual_start,
                "actual_finish": task.actual_finish,
                "duration": task.duration,
                "duration_units": task.duration_units,
                "percent_complete": task.percent_complete,
                "cost": task.cost,
                "baseline_cost": task.baseline_cost,
                "is_milestone": task.is_milestone,
                "is_summary": task.is_summary,
                "is_critical": task.is_critical,
                "resource_names": task.resource_names,
                "notes": task.notes,
            }

            db_item = WBS(**wbs_data)
            self.db.add(db_item)
            self.db.flush()  # Get the DB ID without committing
            unique_id_to_db_id[task.unique_id] = db_item.id

            # Update progress (55-90 range during record creation)
            if i % 50 == 0:
                progress = 55 + (35 * i / total)
                self._update_progress(job, ImportStatus.CREATING_RECORDS, progress)

        # Pass 2: Link parents
        for task in parsed.tasks:
            if (
                task.parent_unique_id is not None
                and task.parent_unique_id in unique_id_to_db_id
            ):
                db_id = unique_id_to_db_id[task.unique_id]
                parent_db_id = unique_id_to_db_id[task.parent_unique_id]
                db_item = self.db.get(WBS, db_id)
                if db_item:
                    db_item.parent_id = parent_db_id

        self.db.commit()
        self._update_progress(job, ImportStatus.CREATING_RECORDS, 95)

    def _update_progress(
        self,
        job: ImportJob,
        status: ImportStatus,
        progress: float,
        **extra_fields,
    ) -> None:
        """Update import job progress."""
        update_data = {"status": status, "progress": progress, **extra_fields}
        self.import_repo.update(job, update_data)

    def _fail_job(self, job: ImportJob, error_message: str) -> None:
        """Mark an import job as failed."""
        self.import_repo.update(
            job,
            {
                "status": ImportStatus.FAILED,
                "error_message": error_message,
                "completed_at": datetime.utcnow(),
            },
        )
        logger.error("Import job %d failed: %s", job.id, error_message)
