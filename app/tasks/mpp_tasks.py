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
    Parse an MS Project file asynchronously.

    JVM startup and file parsing can be slow, making this
    a good candidate for background processing.
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
