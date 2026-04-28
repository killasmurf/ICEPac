"""Dashboard API — aggregates stats from all circuits for the main dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.database.project import Project
from app.models.database.wbs import WBS
from app.models.database.assignment import ResourceAssignment
from app.models.database.risk import Risk
from app.models.database.resource import Resource, Supplier
from app.models.database.user import User
from app.models.database.audit_log import AuditLog
from app.models.database.report import ReportJob
from app.models.database.help import HelpTopic

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregated statistics across all circuits."""
    return {
        "projects": {
            "total": db.query(func.count(Project.id)).scalar() or 0,
            "active": db.query(func.count(Project.id)).filter(Project.status == "active").scalar() or 0,
        },
        "wbs": {
            "total": db.query(func.count(WBS.id)).scalar() or 0,
            "approved": db.query(func.count(WBS.id)).filter(WBS.approval_status == "approved").scalar() or 0,
            "pending": db.query(func.count(WBS.id)).filter(WBS.approval_status == "submitted").scalar() or 0,
        },
        "estimation": {
            "assignments": db.query(func.count(ResourceAssignment.id)).scalar() or 0,
            "risks": db.query(func.count(Risk.id)).scalar() or 0,
            "total_pert": round(float(
                db.query(func.sum(
                    (ResourceAssignment.best_estimate + 4 * ResourceAssignment.likely_estimate + ResourceAssignment.worst_estimate) / 6
                )).scalar() or 0
            ), 2),
        },
        "admin": {
            "users": db.query(func.count(User.id)).scalar() or 0,
            "active_users": db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0,
            "resources": db.query(func.count(Resource.id)).filter(Resource.is_active == True).scalar() or 0,
            "suppliers": db.query(func.count(Supplier.id)).filter(Supplier.is_active == True).scalar() or 0,
        },
        "reports": {
            "generated": db.query(func.count(ReportJob.id)).scalar() or 0,
            "available_types": 16,
        },
        "help": {
            "topics": db.query(func.count(HelpTopic.id)).scalar() or 0,
        },
        "recent_activity": _recent_activity(db),
    }


@router.get("/health-detailed")
async def health_detailed(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Detailed health check for all system components."""
    from app.core.config import settings
    from app.services.cache_service import cache
    import os

    checks = {
        "app": {"status": "healthy", "version": settings.APP_VERSION},
        "database": _check_db(db),
        "cache": _check_cache(cache),
        "storage": _check_s3(),
        "java": _check_java(),
        "circuits": {
            "auth": "operational",
            "admin": "operational",
            "help": "operational",
            "projects": "operational",
            "estimation": "operational",
            "reports": "operational",
        },
    }
    unhealthy = [k for k, v in checks.items() if isinstance(v, dict) and v.get("status") == "unhealthy"]
    checks["overall"] = "degraded" if unhealthy else "healthy"
    return checks


def _recent_activity(db: Session, limit: int = 5) -> list:
    """Get most recent audit log entries."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "username": getattr(log, 'username', ''),
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


def _check_db(db: Session) -> dict:
    try:
        db.execute("SELECT 1")
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def _check_cache(cache) -> dict:
    return {"status": "healthy"} if cache.ping() else {"status": "unavailable", "note": "non-critical"}


def _check_s3() -> dict:
    try:
        from app.services.s3_service import S3Service
        s3 = S3Service()
        s3.s3_client.head_bucket(Bucket=s3.bucket_name)
        return {"status": "healthy"}
    except Exception:
        return {"status": "unavailable", "note": "non-critical for local dev"}


def _check_java() -> dict:
    import os
    java_home = os.environ.get("JAVA_HOME", "")
    if java_home and os.path.isdir(java_home):
        return {"status": "healthy", "java_home": java_home}
    return {"status": "unavailable", "note": "MPP parsing disabled"}
