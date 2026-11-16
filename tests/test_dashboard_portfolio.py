"""Tests for GET /api/v1/dashboard/portfolio."""

import pytest
from sqlalchemy import text

from app.core.security import create_access_token, get_password_hash
from app.models.database.assignment import ResourceAssignment
from app.models.database.project import Project, ProjectStatus
from app.models.database.resource import Resource
from app.models.database.risk import Risk
from app.models.database.user import User, UserRole
from app.models.database.wbs import WBS

URL = "/api/v1/dashboard/portfolio"


@pytest.fixture
def api(client, db, headers):
    """GET helper for the endpoint.

    The in-memory SQLite engine gives each thread its own database, and the
    TestClient serves requests from another thread. Starting a new transaction
    on the session after test setup keeps its connection (and data) checked
    out, so the request sees the rows committed by the test.
    """

    def get(**params):
        db.execute(text("SELECT 1"))
        return client.get(URL, params=params, headers=headers)

    return get


@pytest.fixture
def headers(db):
    user = User(
        email="dash@example.com",
        username="dashuser",
        hashed_password=get_password_hash("password123"),
        role=UserRole.USER,
    )
    db.add(user)
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": "user"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def resource(db):
    res = Resource(resource_code="R1", description="Res", cost=0)
    db.add(res)
    db.commit()
    return res


def _project(db, name, status=ProjectStatus.ACTIVE):
    project = Project(project_name=name, status=status)
    db.add(project)
    db.commit()
    return project


def _wbs(db, project, title="Task", approval_status="draft"):
    wbs = WBS(project_id=project.id, wbs_title=title, approval_status=approval_status)
    db.add(wbs)
    db.commit()
    return wbs


def _assign(db, wbs, best, likely, worst):
    db.add(
        ResourceAssignment(
            wbs_id=wbs.id,
            resource_code="R1",
            best_estimate=best,
            likely_estimate=likely,
            worst_estimate=worst,
        )
    )
    db.commit()


def test_empty_database(api):
    resp = api()
    assert resp.status_code == 200
    assert resp.json() == {
        "projects": [],
        "approval_totals": {
            "draft": 0,
            "submitted": 0,
            "approved": 0,
            "rejected": 0,
        },
    }


def test_totals_ordering_and_counts(api, db, resource):
    alpha = _project(db, "Alpha")
    beta = _project(db, "Beta", ProjectStatus.DRAFT)
    a1 = _wbs(db, alpha, "a1", "approved")
    a2 = _wbs(db, alpha, "a2", "submitted")
    _wbs(db, alpha, "a3", "draft")
    b1 = _wbs(db, beta, "b1", "rejected")
    _assign(db, a1, 10, 20, 30)  # (10 + 80 + 30) / 6 = 20.00
    _assign(db, a2, 1, 1, 1)  # 1.00
    _assign(db, b1, 100, 200, 301)  # (100 + 800 + 301) / 6 = 200.1666..

    data = api().json()
    assert [p["name"] for p in data["projects"]] == ["Beta", "Alpha"]
    beta_row, alpha_row = data["projects"]
    assert beta_row == {
        "project_id": beta.id,
        "name": "Beta",
        "status": "draft",
        "wbs_total": 1,
        "wbs_approved": 0,
        "wbs_submitted": 0,
        "total_pert": 200.17,
        "risk_count": 0,
    }
    assert alpha_row["status"] == "active"
    assert alpha_row["total_pert"] == 21.0
    assert alpha_row["wbs_total"] == 3
    assert alpha_row["wbs_approved"] == 1
    assert alpha_row["wbs_submitted"] == 1
    assert data["approval_totals"] == {
        "draft": 1,
        "submitted": 1,
        "approved": 1,
        "rejected": 1,
    }


def test_project_without_assignments_has_zero_pert(api, db):
    project = _project(db, "Empty")
    _wbs(db, project)
    data = api().json()
    assert len(data["projects"]) == 1
    assert data["projects"][0]["total_pert"] == 0
    assert data["projects"][0]["wbs_total"] == 1


def test_project_without_wbs_still_listed(api, db):
    _project(db, "Bare")
    data = api().json()
    assert data["projects"][0]["name"] == "Bare"
    assert data["projects"][0]["wbs_total"] == 0


def test_ties_ordered_by_name(api, db):
    _project(db, "Zulu")
    _project(db, "Alpha")
    names = [p["name"] for p in api().json()["projects"]]
    assert names == ["Alpha", "Zulu"]


def test_risk_count_includes_wbs_and_project_level(api, db, resource):
    project = _project(db, "Risky")
    other = _project(db, "Other")
    w1 = _wbs(db, project, "w1")
    w2 = _wbs(db, project, "w2")
    _assign(db, w1, 6, 6, 6)  # 6.00; multiple risks must not multiply the sum
    db.add_all(
        [
            Risk(wbs_id=w1.id, title="wbs risk 1"),
            Risk(wbs_id=w1.id, title="wbs risk 2"),
            Risk(wbs_id=w2.id, title="wbs risk 3"),
            Risk(project_id=project.id, title="project risk 1"),
            Risk(project_id=project.id, title="project risk 2"),
            Risk(project_id=other.id, title="other project risk"),
        ]
    )
    db.commit()
    rows = {p["name"]: p for p in api().json()["projects"]}
    assert rows["Risky"]["risk_count"] == 5
    assert rows["Risky"]["total_pert"] == 6.0
    assert rows["Other"]["risk_count"] == 1


def test_limit_one(api, db):
    _project(db, "One")
    _project(db, "Two")
    data = api(limit=1).json()
    assert len(data["projects"]) == 1


@pytest.mark.parametrize("limit", [0, 101])
def test_limit_out_of_range_is_422(api, limit):
    resp = api(limit=limit)
    assert resp.status_code == 422


def test_unauthenticated_is_401(client):
    assert client.get(URL).status_code == 401
