"""F-01 (approval response), F-02 (risk_exposure on create), F-04 (estimation)."""

import pytest

from app.models.database.user import UserRole
from tests.helpers import auth, make_user, seed_project

BASE = "/api/v1/projects"


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def seeded(db):
    return seed_project(db)


# ---- F-01 -------------------------------------------------------------------


def test_get_approval_returns_wbs_id(client, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_a"].id
    resp = client.get(f"{BASE}/{pid}/wbs/{wid}/approval", headers=auth(admin))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["wbs_id"] == wid
    assert "id" not in body
    assert body["approval_status"] == "draft"


def test_post_approval_returns_wbs_id_and_new_status(client, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_a"].id
    url = f"{BASE}/{pid}/wbs/{wid}/approval"
    resp = client.post(url, json={"action": "submit"}, headers=auth(admin))
    assert resp.status_code == 200, resp.text
    assert resp.json()["wbs_id"] == wid
    assert resp.json()["approval_status"] == "submitted"
    resp = client.post(url, json={"action": "approve"}, headers=auth(admin))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["wbs_id"] == wid
    assert body["approval_status"] == "approved"
    assert body["approver"] == "boss"


# ---- F-02 -------------------------------------------------------------------

RISK = {
    "title": "probe",
    "risk_cost": "1000.00",
    "risk_category_code": "TECH",
    "probability_code": "HIGH",
    "severity_code": "MAJ",
}


def test_create_wbs_risk(client, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_b"].id
    resp = client.post(f"{BASE}/{pid}/wbs/{wid}/risks", json=RISK, headers=auth(admin))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["wbs_id"] == wid
    assert body["risk_exposure"] == 250.0


def test_create_wbs_risk_ignores_client_supplied_exposure(client, admin, seeded):
    pid, wid = seeded["project"].id, seeded["root_b"].id
    resp = client.post(
        f"{BASE}/{pid}/wbs/{wid}/risks",
        json={**RISK, "risk_exposure": 999999},
        headers=auth(admin),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["risk_exposure"] == 250.0


def test_create_project_risk(client, admin, seeded):
    pid = seeded["project"].id
    resp = client.post(
        f"{BASE}/{pid}/risks",
        json={**RISK, "risk_exposure": 5},
        headers=auth(admin),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["project_id"] == pid


def test_minimal_project_risk_probe(client, admin, seeded):
    """The exact probe from the smoke report."""
    pid = seeded["project"].id
    resp = client.post(
        f"{BASE}/{pid}/risks",
        json={"title": "probe", "risk_cost": 10},
        headers=auth(admin),
    )
    assert resp.status_code == 201, resp.text


def test_update_wbs_risk_and_project_risk(client, admin, seeded):
    pid = seeded["project"].id
    wid = seeded["root_b"].id
    r1 = client.post(
        f"{BASE}/{pid}/wbs/{wid}/risks", json=RISK, headers=auth(admin)
    ).json()
    resp = client.put(
        f"{BASE}/{pid}/wbs/{wid}/risks/{r1['id']}",
        json={"risk_cost": "2000.00", "risk_exposure": 1},
        headers=auth(admin),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["risk_exposure"] == 500.0

    r2 = client.post(f"{BASE}/{pid}/risks", json=RISK, headers=auth(admin)).json()
    resp = client.put(
        f"{BASE}/{pid}/risks/{r2['id']}",
        json={"title": "renamed", "risk_exposure": 1},
        headers=auth(admin),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "renamed"


# ---- F-04 -------------------------------------------------------------------


def test_project_estimation_counts_wbs_and_project_risks(client, admin, seeded):
    pid = seeded["project"].id
    resp = client.get(f"{BASE}/{pid}/estimation", headers=auth(admin))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # 2 WBS-level + 1 project-level, each 250 exposure; no double counting
    assert body["total_risks"] == 3
    assert body["total_risk_exposure"] == 750.0
    rows = {r["wbs_id"]: r for r in body["wbs_summaries"]}
    assert rows[seeded["root_a"].id]["risk_count"] == 1
    assert rows[seeded["root_a"].id]["total_risk_exposure"] == 250.0
    assert rows[seeded["child"].id]["risk_count"] == 1
    assert rows[seeded["root_b"].id]["risk_count"] == 0
    # WBS rows hold only WBS-level risks; project-level is the remainder
    assert sum(r["risk_count"] for r in rows.values()) == 2
    assert sum(r["total_risk_exposure"] for r in rows.values()) == 500.0
    assert body["risk_adjusted_estimate"] == pytest.approx(
        body["total_pert_estimate"] + 750.0
    )


def test_project_estimation_matches_portfolio_risk_count(client, admin, seeded):
    pid = seeded["project"].id
    est = client.get(f"{BASE}/{pid}/estimation", headers=auth(admin)).json()
    portfolio = client.get("/api/v1/dashboard/portfolio", headers=auth(admin))
    assert portfolio.status_code == 200, portfolio.text
    projects = portfolio.json()["projects"]
    mine = next(p for p in projects if p["project_id"] == pid)
    assert mine["risk_count"] == est["total_risks"]
