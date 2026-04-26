"""Celery tasks for async report generation."""
from datetime import datetime, timedelta
from app.tasks import celery_app


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def generate_report_async(self, job_id: int, request_dict: dict):
    """Generate a report asynchronously and save the result."""
    from app.core.database import SessionLocal
    from app.repositories.report_repository import ReportRepository
    from app.services.report_engine import ReportEngine
    from app.services.report_exporters import ReportExporter
    from app.models.schemas.report import ReportRequest, ExportFormat

    db = SessionLocal()
    try:
        repo = ReportRepository(db)
        repo.update_job(job_id, status="generating", started_at=datetime.utcnow())

        request = ReportRequest(**request_dict)
        engine = ReportEngine(db)
        result = engine.generate(request)

        if request.export_format != ExportFormat.JSON:
            content, content_type, filename = ReportExporter.export(result, request.export_format)

            # Save to S3
            try:
                from app.services.s3_service import S3Service
                s3 = S3Service()
                s3_key = f"reports/{filename}"
                s3.upload_file(content, s3_key, content_type)
                repo.update_job(
                    job_id, status="completed", completed_at=datetime.utcnow(),
                    row_count=result.row_count, file_path=s3_key,
                    file_size=len(content),
                    expires_at=datetime.utcnow() + timedelta(hours=24),
                    result_summary=result.totals,
                )
            except Exception:
                # Fallback: store result summary without file
                repo.update_job(
                    job_id, status="completed", completed_at=datetime.utcnow(),
                    row_count=result.row_count,
                    result_summary=result.totals,
                )
        else:
            repo.update_job(
                job_id, status="completed", completed_at=datetime.utcnow(),
                row_count=result.row_count, result_summary=result.totals,
            )

    except Exception as exc:
        repo.update_job(job_id, status="failed", error_message=str(exc),
                        completed_at=datetime.utcnow())
        raise self.retry(exc=exc)
    finally:
        db.close()
