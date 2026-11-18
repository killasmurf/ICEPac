"""Contract tests for the reporting subsystem.

Ported from PR #11 (commits c1f0869 and 6ace7fa) and adapted to current main
(real SQLite via ``client``/``db``, JWTs built directly so the login rate
limiter is never involved, shared seed from ``tests.helpers``).

Covers: every ``REPORT_CATALOG`` type generating without a 500, the
convenience routes, the empty-report totals contract, the four exporters, and
F-15 (totals from unrounded values, per-report first column label).
"""

from decimal import Decimal

import pytest
from sqlalchemy import text

from app.models.database.assignment import ResourceAssignment
from app.models.database.audit_log import AuditLog
from app.models.database.project import Project
from app.models.database.user import UserRole
from app.models.database.wbs import WBS
from app.models.schemas.report import (
    REPORT_CATALOG,
    ExportFormat,
    ReportRequest,
    ReportResult,
    ReportType,
)
from app.services.report_exporters import ReportExporter
from tests.helpers import auth, make_user, seed_project

API = "/api/v1/reports"
CATALOG_TYPES = [r["type"] for cat in REPORT_CATALOG.values() for r in cat["reports"]]


@pytest.fixture
def admin(db):
    return make_user(db, "boss", UserRole.ADMIN)


@pytest.fixture
def seeded(db, admin):
    data = seed_project(db)
    db.add(
        AuditLog(
            user_id=admin.id,
            action="UPDATE",
            entity_type="resource_assignment",
            entity_id=1,
        )
    )
    db.commit()
    return data


def _generate(client, admin, project_id, report_type, **extra):
    return client.post(
        f"{API}/generate",
        json={
            "report_type": report_type,
            "filters": {"project_id": project_id},
            **extra,
        },
        headers=auth(admin),
    )


def test_catalog_lists_every_report_type_once():
    assert sorted(CATALOG_TYPES) == sorted(rt.value for rt in ReportType)


@pytest.mark.parametrize("report_type", CATALOG_TYPES)
def test_every_catalog_report_generates_well_formed_result(
    client, admin, seeded, report_type
):
    resp = _generate(client, admin, seeded["project"].id, report_type)
    assert resp.status_code == 200, f"{report_type}: {resp.text}"
    body = resp.json()
    ReportResult(**{**body, "generated_at": body["generated_at"]})
    assert body["report_type"] == report_type
    assert body["row_count"] == len(body["rows"])
    assert isinstance(body["totals"], dict)
    assert body["columns"] and all({"key", "label"} <= set(c) for c in body["columns"])
    if report_type not in ("approver_activity",):
        assert body["row_count"] > 0, "seed data should produce rows"


@pytest.mark.parametrize("report_type", CATALOG_TYPES)
def test_every_catalog_report_is_ok_for_an_empty_project(
    client, db, admin, report_type
):
    project = Project(project_name="Empty")
    db.add(project)
    db.commit()
    resp = _generate(client, admin, project.id, report_type)
    assert resp.status_code == 200, f"{report_type}: {resp.text}"
    body = resp.json()
    assert isinstance(body["totals"], dict)
    assert body["row_count"] == len(body["rows"])


@pytest.mark.parametrize("report_type", CATALOG_TYPES)
def test_every_catalog_report_survives_unknown_project(client, admin, report_type):
    resp = _generate(client, admin, 9999, report_type)
    assert resp.status_code in (200, 404, 422), resp.text


@pytest.mark.parametrize("fmt", ["csv", "xlsx", "pdf", "docx"])
@pytest.mark.parametrize("report_type", CATALOG_TYPES)
def test_every_catalog_report_exports(client, admin, seeded, report_type, fmt):
    resp = client.post(
        f"{API}/export",
        json={
            "report_type": report_type,
            "export_format": fmt,
            "filters": {"project_id": seeded["project"].id},
        },
        headers=auth(admin),
    )
    assert resp.status_code == 200, f"{report_type}/{fmt}: {resp.text[:300]}"
    assert len(resp.content) > 0
    assert "attachment" in resp.headers["content-disposition"]


# ---- convenience routes ------------------------------------------------------

ROUTE_FOR = {
    "cost_by_wbs": "cost-by-wbs",
    "cost_by_resource": "cost-by-resource",
    "cost_by_supplier": "cost-by-supplier",
    "cost_by_eoc": "cost-by-eoc",
    "cost_by_technique": "cost-by-technique",
    "boe_summary": "boe-summary",
    "boe_detailed": "boe-detailed",
    "risk_assessment": "risk-assessment",
    "risk_summary": "risk-summary",
    "estimator_activity": "estimator-activity",
    "change_history": "change-history",
}
# Advertised in the catalog; only reachable through /generate and /export.
NO_CONVENIENCE_ROUTE = [
    "cost_by_region",
    "boe_by_wbs",
    "approver_activity",
    "resource_utilization",
    "project_summary",
]


def test_convenience_routes_plus_missing_ones_cover_the_catalog():
    assert sorted([*ROUTE_FOR, *NO_CONVENIENCE_ROUTE]) == sorted(CATALOG_TYPES)


@pytest.mark.parametrize("report_type,route", sorted(ROUTE_FOR.items()))
def test_convenience_route_returns_report(client, admin, seeded, report_type, route):
    resp = client.post(
        f"{API}/{route}",
        json={
            "report_type": report_type,
            "filters": {"project_id": seeded["project"].id},
        },
        headers=auth(admin),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["report_type"] == report_type


@pytest.mark.parametrize("report_type", NO_CONVENIENCE_ROUTE)
def test_catalog_reports_without_a_convenience_route_are_404_not_500(
    client, admin, seeded, report_type
):
    resp = client.post(
        f"{API}/{report_type.replace('_', '-')}",
        json={
            "report_type": report_type,
            "filters": {"project_id": seeded["project"].id},
        },
        headers=auth(admin),
    )
    assert resp.status_code == 404


# ---- column-name drift fixes (PR #11 6ace7fa, aebd24c) -----------------------


def test_cost_by_wbs_rows_use_wbs_title(client, admin, seeded):
    body = _generate(client, admin, seeded["project"].id, "cost_by_wbs").json()
    labels = {r["group_label"] for r in body["rows"]}
    assert "1 - Root A" in labels
    assert "1.1 - Child A1" in labels


def test_boe_detailed_handles_decimal_columns(client, admin, seeded):
    body = _generate(client, admin, seeded["project"].id, "boe_detailed").json()
    row = next(r for r in body["rows"] if r["wbs_code"] == "1")
    # (100 + 4*200 + 400) / 6
    assert row["pert_estimate"] == 216.67
    assert row["wbs_title"] == "Root A"
    assert body["totals"]["best_estimate"] == 111.0


def test_risk_reports_use_real_risk_columns_and_both_scopes(client, admin, seeded):
    pid = seeded["project"].id
    body = _generate(client, admin, pid, "risk_assessment").json()
    assert body["row_count"] == 3
    assert {r["category"] for r in body["rows"]} == {"TECH"}
    assert all(r["exposure"] == 250.0 for r in body["rows"])
    assert body["totals"]["exposure"] == 750.0
    assert [r["wbs_title"] for r in body["rows"]].count("(Project level)") == 1

    summary = _generate(client, admin, pid, "risk_summary").json()
    assert summary["rows"][0]["risk_count"] == 3
    assert summary["rows"][0]["total_exposure"] == 750.0
    assert summary["totals"] == {"risk_count": 3, "total_exposure": 750.0}


def test_project_summary_counts_both_risk_scopes(client, admin, seeded):
    body = _generate(client, admin, seeded["project"].id, "project_summary").json()
    row = body["rows"][0]
    assert row["risk_count"] == 3
    assert row["wbs_count"] == 3
    assert row["assignment_count"] == 3
    assert row["status"] == "draft"


# ---- empty-report totals contract (PR #11 6ace7fa) ---------------------------


def test_empty_cost_report_has_zeroed_totals_not_none(client, db, admin):
    project = Project(project_name="Empty")
    db.add(project)
    db.commit()
    body = _generate(client, admin, project.id, "cost_by_wbs").json()
    assert body["row_count"] == 0
    for key in (
        "best_total",
        "likely_total",
        "worst_total",
        "pert_total",
        "std_dev",
        "confidence_80_low",
        "confidence_80_high",
        "assignment_count",
    ):
        assert body["totals"][key] == 0, key


# ---- F-15: totals from unrounded values, first column label ------------------


def test_totals_are_summed_before_rounding(client, db, admin):
    """Each row's PERT is 99.98 / 6 = 16.66333 and displays as 16.66. Summing
    the displayed rows gives 49.98; the true total 49.99 is what must show."""
    project = Project(project_name="Rounding")
    db.add(project)
    db.commit()
    from tests.helpers import seed_config

    seed_config(db)
    for i in range(3):
        wbs = WBS(project_id=project.id, wbs_code=str(i + 1), wbs_title=f"W{i}")
        db.add(wbs)
        db.commit()
        db.add(
            ResourceAssignment(
                wbs_id=wbs.id,
                resource_code="ENG",
                best_estimate=Decimal("0.00"),
                likely_estimate=Decimal("0.00"),
                worst_estimate=Decimal("99.98"),
            )
        )
    db.commit()
    body = _generate(client, admin, project.id, "cost_by_wbs").json()
    assert [r["pert_total"] for r in body["rows"]] == [16.66, 16.66, 16.66]
    assert body["totals"]["pert_total"] == 49.99
    assert body["totals"]["worst_total"] == 299.94


def test_risk_exposure_totals_are_summed_before_rounding(client, db, admin):
    """Exposure 0.0175 per risk displays as 0.02; three of them total 0.0525 = 0.05."""
    from app.models.database.risk import Risk
    from tests.helpers import seed_config

    seed_config(db)
    project = Project(project_name="Risky")
    db.add(project)
    db.commit()
    for i in range(3):
        db.add(
            Risk(
                title=f"r{i}",
                project_id=project.id,
                risk_cost=Decimal("0.07"),
                probability_code="HIGH",
                severity_code="MAJ",
            )
        )
    db.commit()
    body = _generate(client, admin, project.id, "risk_assessment").json()
    assert [r["exposure"] for r in body["rows"]] == [0.02, 0.02, 0.02]
    assert body["totals"]["exposure"] == 0.05


def test_cost_totals_match_project_estimation_header(client, admin, seeded):
    pid = seeded["project"].id
    est = client.get(f"/api/v1/projects/{pid}/estimation", headers=auth(admin)).json()
    body = _generate(client, admin, pid, "cost_by_wbs").json()
    assert body["totals"]["pert_total"] == round(est["total_pert_estimate"], 2)


FIRST_LABEL = {
    "cost_by_wbs": "WBS Item",
    "cost_by_resource": "Resource",
    "cost_by_supplier": "Supplier",
    "cost_by_eoc": "Element of Cost",
    "cost_by_technique": "Technique",
    "cost_by_region": "Region",
    "boe_summary": "WBS Item",
    "boe_by_wbs": "WBS Item",
}


@pytest.mark.parametrize("report_type,label", sorted(FIRST_LABEL.items()))
def test_first_column_label_matches_report(client, admin, seeded, report_type, label):
    body = _generate(client, admin, seeded["project"].id, report_type).json()
    assert body["columns"][0] == {"key": "group_label", "label": label}


def test_first_column_labels_do_not_share_state():
    from app.services.report_engine import REPORT_COLUMNS

    assert REPORT_COLUMNS[ReportType.COST_BY_WBS][0]["label"] == "WBS Item"
    assert (
        REPORT_COLUMNS[ReportType.COST_BY_RESOURCE][0]
        is not REPORT_COLUMNS[ReportType.COST_BY_WBS][0]
    )


# ---- include_charts removal -------------------------------------------------


def test_include_charts_is_gone_but_old_clients_are_still_accepted(
    client, admin, seeded
):
    assert "include_charts" not in ReportRequest.model_fields
    resp = _generate(
        client, admin, seeded["project"].id, "cost_by_wbs", include_charts=True
    )
    assert resp.status_code == 200


# ---- exporters (PR #11 c1f0869) ----------------------------------------------


@pytest.fixture
def minimal_result():
    from datetime import datetime

    return ReportResult(
        report_type="cost_by_wbs",
        title="Test Report",
        generated_at=datetime.utcnow(),
        project_name="P",
        filters_applied={"project_id": 1},
        columns=[{"key": "group_label", "label": "WBS Item"}],
        rows=[{"group_label": "100", "best_total": 1000.0}],
        totals={"best_total": 1000.0},
        row_count=1,
    )


@pytest.mark.parametrize(
    "fmt,ctype,ext,magic",
    [
        (ExportFormat.CSV, "text/csv", ".csv", b""),
        (ExportFormat.PDF, "application/pdf", ".pdf", b"%PDF"),
        (ExportFormat.XLSX, "spreadsheet", ".xlsx", b"PK"),
        (ExportFormat.DOCX, "wordprocessing", ".docx", b"PK"),
    ],
)
def test_exporters_produce_files(minimal_result, fmt, ctype, ext, magic):
    content, content_type, filename = ReportExporter.export(minimal_result, fmt)
    assert content.startswith(magic) and len(content) > 0
    assert ctype in content_type
    assert filename.endswith(ext)


# ---- User.role persisted as enum values (PR #11 user.py) ---------------------


def test_user_role_is_stored_as_enum_value_and_login_works(client, db):
    from tests.helpers import PASSWORD

    make_user(db, "stored", UserRole.MANAGER)
    raw = db.execute(
        text("SELECT role FROM tblUsers WHERE username = 'stored'")
    ).scalar()
    assert raw == "manager"  # the PostgreSQL enum holds 'manager', not 'MANAGER'
    resp = client.post(
        "/api/v1/auth/login", data={"username": "stored", "password": PASSWORD}
    )
    assert resp.status_code == 200, resp.text
