"""Archived projects are excluded from every dashboard figure until restored."""

import pytest
from sqlalchemy import text

from app.core.security import create_access_token, get_password_hash
from app.models.database.assignment import ResourceAssignment
from app.models.database.project import Project, ProjectStatus
from app.models.database.resource import Resource
from app.models.database.risk import Risk
from app.models.database.user import User, UserRole
from app.models.database.wbs import WBS


@pytest.fixture
def get(client, db):
    """GET helper. See tests/test_dashboard_portfolio.py for why SELECT 1 is needed."""
    user = User(
        email="archived-dash@example.com",
        username="archiveddash",
        hashed_password=get_password_hash("password123"),
        role=UserRole.USER,
    )
    db.add(user)
    db.add(Resource(resource_code="R1", description="Res", cost=0))
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": "user"})
    headers = {"Authorization": f"Bearer {token}"}

    def _get(url):
        db.execute(text("SELECT 1"))
        resp = client.get(url, headers=headers)
        assert resp.status_code == 200, resp.text
        return resp.json()

    return _get


def _project_with_data(db, name, best, likely, worst, archived=False):
    """A project with one approved and one submitted WBS item, one assignment,
    one WBS-level risk and one project-level risk."""
    project = Project(project_name=name, status=ProjectStatus.ACTIVE, archived=archived)
    db.add(project)
    db.commit()
    approved = WBS(project_id=project.id, wbs_title="a", approval_status="approved")
    submitted = WBS(project_id=project.id, wbs_title="b", approval_status="submitted")
    db.add_all([approved, submitted])
    db.commit()
    db.add(
        ResourceAssignment(
            wbs_id=approved.id,
            resource_code="R1",
            best_estimate=best,
            likely_estimate=likely,
            worst_estimate=worst,
        )
    )
    db.add(Risk(wbs_id=approved.id, title="wbs risk", risk_cost=1))
    db.add(Risk(project_id=project.id, title="project risk", risk_cost=1))
    db.commit()
    return project


def test_stats_exclude_archived_projects(get, db):
    _project_with_data(db, "Live", 6, 6, 6)  # PERT 6.00
    archived = _project_with_data(db, "Gone", 600, 600, 600, archived=True)

    stats = get("/api/v1/dashboard/stats")
    assert stats["projects"] == {"total": 1, "active": 1}
    assert stats["wbs"] == {"total": 2, "approved": 1, "pending": 1}
    assert stats["estimation"]["assignments"] == 1
    assert stats["estimation"]["risks"] == 2
    assert stats["estimation"]["total_pert"] == 6.0

    # Restoring the project brings every figure back.
    archived.archived = False
    db.commit()
    stats = get("/api/v1/dashboard/stats")
    assert stats["projects"] == {"total": 2, "active": 2}
    assert stats["wbs"] == {"total": 4, "approved": 2, "pending": 2}
    assert stats["estimation"]["assignments"] == 2
    assert stats["estimation"]["risks"] == 4
    assert stats["estimation"]["total_pert"] == 606.0


def test_portfolio_excludes_archived_projects(get, db):
    _project_with_data(db, "Live", 6, 6, 6)
    _project_with_data(db, "Gone", 600, 600, 600, archived=True)

    data = get("/api/v1/dashboard/portfolio")
    assert [p["name"] for p in data["projects"]] == ["Live"]
    assert data["projects"][0]["risk_count"] == 2
    assert data["approval_totals"] == {
        "draft": 0,
        "submitted": 1,
        "approved": 1,
        "rejected": 0,
    }


def test_stats_and_portfolio_agree(get, db):
    _project_with_data(db, "A", 6, 6, 6)
    _project_with_data(db, "B", 12, 12, 12)
    _project_with_data(db, "C", 600, 600, 600, archived=True)

    stats = get("/api/v1/dashboard/stats")
    portfolio = get("/api/v1/dashboard/portfolio")
    assert stats["estimation"]["total_pert"] == sum(
        p["total_pert"] for p in portfolio["projects"]
    )
    assert stats["estimation"]["risks"] == sum(
        p["risk_count"] for p in portfolio["projects"]
    )
    assert stats["wbs"]["total"] == sum(p["wbs_total"] for p in portfolio["projects"])
