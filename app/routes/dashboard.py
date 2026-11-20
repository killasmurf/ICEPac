"""Dashboard API — aggregates stats from all circuits for the main dashboard."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.database.assignment import ResourceAssignment
from app.models.database.audit_log import AuditLog
from app.models.database.help import HelpTopic
from app.models.database.project import Project
from app.models.database.report import ReportJob
from app.models.database.resource import Resource, Supplier
from app.models.database.risk import Risk
from app.models.database.user import User
from app.models.database.wbs import WBS
from app.models.schemas.dashboard import (
    ApprovalTotals,
    PortfolioProject,
    PortfolioResponse,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregated statistics across all circuits.

    Project, WBS, assignment and risk figures cover live projects only: an
    archived project drops out of every total until it is restored.
    """
    live = _live_project_ids(db)
    live_wbs = db.query(WBS.id).filter(WBS.project_id.in_(live))
    wbs_q = db.query(func.count(WBS.id)).filter(WBS.project_id.in_(live))
    # A risk belongs to a WBS item or directly to a project, never both.
    live_risks = or_(Risk.wbs_id.in_(live_wbs), Risk.project_id.in_(live))
    return {
        "projects": {
            "total": db.query(func.count(Project.id))
            .filter(Project.archived.is_(False))
            .scalar()
            or 0,
            "active": db.query(func.count(Project.id))
            .filter(Project.archived.is_(False), Project.status == "active")
            .scalar()
            or 0,
        },
        "wbs": {
            "total": wbs_q.scalar() or 0,
            "approved": wbs_q.filter(WBS.approval_status == "approved").scalar() or 0,
            "pending": wbs_q.filter(WBS.approval_status == "submitted").scalar() or 0,
        },
        "estimation": {
            "assignments": db.query(func.count(ResourceAssignment.id))
            .filter(ResourceAssignment.wbs_id.in_(live_wbs))
            .scalar()
            or 0,
            "risks": db.query(func.count(Risk.id)).filter(live_risks).scalar() or 0,
            "total_pert": round(
                float(
                    db.query(
                        func.sum(
                            (
                                ResourceAssignment.best_estimate
                                + 4 * ResourceAssignment.likely_estimate
                                + ResourceAssignment.worst_estimate
                            )
                            / 6
                        )
                    )
                    .filter(ResourceAssignment.wbs_id.in_(live_wbs))
                    .scalar()
                    or 0
                ),
                2,
            ),
        },
        "admin": {
            "users": db.query(func.count(User.id)).scalar() or 0,
            "active_users": db.query(func.count(User.id))
            .filter(User.is_active.is_(True))
            .scalar()
            or 0,
            "resources": db.query(func.count(Resource.id))
            .filter(Resource.is_active.is_(True))
            .scalar()
            or 0,
            "suppliers": db.query(func.count(Supplier.id))
            .filter(Supplier.is_active.is_(True))
            .scalar()
            or 0,
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


@router.get("/portfolio", response_model=PortfolioResponse)
async def dashboard_portfolio(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Per-project portfolio summary, ordered by total PERT estimate (desc).

    Uses separate grouped aggregate queries (never joined together, to avoid
    fan-out) and combines them in Python. Archived projects are excluded.
    """
    live = _live_project_ids(db)
    # WBS counts per (project, approval status)
    wbs_counts: dict = {}
    approval_totals = {"draft": 0, "submitted": 0, "approved": 0, "rejected": 0}
    rows = (
        db.query(WBS.project_id, WBS.approval_status, func.count(WBS.id))
        .filter(WBS.project_id.in_(live))
        .group_by(WBS.project_id, WBS.approval_status)
        .all()
    )
    for project_id, approval_status, count in rows:
        per_project = wbs_counts.setdefault(project_id, {})
        per_project[approval_status] = count
        if approval_status in approval_totals:
            approval_totals[approval_status] += count

    # PERT total per project (assignment -> WBS -> project)
    pert_rows = (
        db.query(
            WBS.project_id,
            func.sum(
                (
                    ResourceAssignment.best_estimate
                    + 4 * ResourceAssignment.likely_estimate
                    + ResourceAssignment.worst_estimate
                )
                / 6
            ),
        )
        .join(WBS, ResourceAssignment.wbs_id == WBS.id)
        .filter(WBS.project_id.in_(live))
        .group_by(WBS.project_id)
        .all()
    )
    pert_by_project = {pid: float(total or 0) for pid, total in pert_rows}

    # Risks: WBS-level (via WBS) and project-level (direct); XOR, so no overlap
    risk_by_project: dict = {}
    wbs_risk_rows = (
        db.query(WBS.project_id, func.count(Risk.id))
        .join(WBS, Risk.wbs_id == WBS.id)
        .filter(WBS.project_id.in_(live))
        .group_by(WBS.project_id)
        .all()
    )
    for pid, count in wbs_risk_rows:
        risk_by_project[pid] = risk_by_project.get(pid, 0) + count
    direct_risk_rows = (
        db.query(Risk.project_id, func.count(Risk.id))
        .filter(Risk.project_id.in_(live))
        .group_by(Risk.project_id)
        .all()
    )
    for pid, count in direct_risk_rows:
        risk_by_project[pid] = risk_by_project.get(pid, 0) + count

    projects = []
    for project_id, name, status in (
        db.query(Project.id, Project.project_name, Project.status)
        .filter(Project.archived.is_(False))
        .all()
    ):
        counts = wbs_counts.get(project_id, {})
        projects.append(
            PortfolioProject(
                project_id=project_id,
                name=name,
                status=getattr(status, "value", status),
                wbs_total=sum(counts.values()),
                wbs_approved=counts.get("approved", 0),
                wbs_submitted=counts.get("submitted", 0),
                total_pert=round(pert_by_project.get(project_id, 0.0), 2),
                risk_count=risk_by_project.get(project_id, 0),
            )
        )
    projects.sort(key=lambda p: (-p.total_pert, p.name))

    return PortfolioResponse(
        projects=projects[:limit],
        approval_totals=ApprovalTotals(**approval_totals),
    )


@router.get("/health-detailed")
def health_detailed(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Detailed health check for all system components.

    Deliberately a plain ``def``: FastAPI runs it in the threadpool, so the
    blocking database, Redis and S3 probes cannot freeze the event loop (and
    with it every other request) while a dependency is slow or unreachable.
    """
    from app.core.config import settings
    from app.services.cache_service import cache

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
    unhealthy = [
        k
        for k, v in checks.items()
        if isinstance(v, dict) and v.get("status") == "unhealthy"
    ]
    checks["overall"] = "degraded" if unhealthy else "healthy"
    return checks


def _live_project_ids(db: Session):
    """Subquery of the ids of projects that are not archived."""
    return db.query(Project.id).filter(Project.archived.is_(False))


def _recent_activity(db: Session, limit: int = 5) -> list:
    """Get most recent audit log entries."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            # AuditLog.user is joined-loaded, so this is not an N+1.
            "username": log.user.username if log.user else None,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


def _check_db(db: Session) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def _check_cache(cache) -> dict:
    return (
        {"status": "healthy"}
        if cache.ping()
        else {"status": "unavailable", "note": "non-critical"}
    )


def _check_s3() -> dict:
    try:
        from botocore.config import Config

        from app.services.s3_service import S3Service

        # Short timeouts and no retries: an unreachable endpoint must fail in
        # ~2 s, not the botocore default of minutes.
        s3 = S3Service(
            client_config=Config(
                connect_timeout=2,
                read_timeout=2,
                retries={"max_attempts": 1},
            )
        )
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
