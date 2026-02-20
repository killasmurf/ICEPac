"""
Celery tasks for MS Project file parsing.
"""
import logging
from typing import Any, Dict

from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.parse_mpp_file")
def parse_mpp_file(self, file_contents: bytes, filename: str) -> Dict[str, Any]:
    """
    Parse an MS Project file asynchronously (legacy).

    Deprecated: Use process_mpp_import instead.
    """
    logger.info(f"Starting MPP parse for: {filename}")
    self.update_state(state="PARSING", meta={"filename": filename})

    try:
        from app.services.mpp_reader import MPPReader

        reader = MPPReader()
        result = reader.parse(file_contents, filename)
        logger.info(f"Successfully parsed: {filename}")
        return result
    except Exception as exc:
        logger.error(f"Failed to parse {filename}: {exc}")
        raise self.retry(exc=exc, max_retries=2, countdown=5)


@celery_app.task(bind=True, name="tasks.process_mpp_import", max_retries=1)
def process_mpp_import(self, import_job_id: int) -> Dict[str, Any]:
    """
    Process an MS Project file import end-to-end.

    Downloads from S3, parses with MPPParser, creates WBS records,
    and updates project metadata. Uses its own DB session.
    """
    logger.info("Starting import processing: job_id=%d", import_job_id)

    from app.core.database import SessionLocal
    from app.services.import_service import ImportService

    db = SessionLocal()
    try:
        service = ImportService(db)
        service.process_import(import_job_id)
        return {"status": "completed", "job_id": import_job_id}
    except Exception as exc:
        logger.exception("Import task failed: job_id=%d", import_job_id)
        # Try to mark the job as failed
        try:
            from datetime import datetime

            from app.models.database.import_job import ImportJob, ImportStatus

            job = db.get(ImportJob, import_job_id)
            if job and job.status != ImportStatus.FAILED:
                job.status = ImportStatus.FAILED
                job.error_message = str(exc)
                job.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            logger.exception("Failed to update job status after error")
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
