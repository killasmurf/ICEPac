"""Seed a SQLite database with realistic data for the real-API smoke suite.

Usage (from the repo root):

    DATABASE_URL=sqlite:////tmp/icepac-smoke.db python scripts/seed_smoke.py [--reset]

Idempotent: every row is get-or-created by its natural key, so running it twice
does not duplicate anything. Use --reset to drop and recreate every table first
(needed before each smoke run, because the suite mutates the data).

Constants live in scripts/seed_smoke_data.json, which the Playwright spec also reads.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

DATA = json.loads((Path(__file__).parent / "seed_smoke_data.json").read_text())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="drop all tables first")
    parser.add_argument(
        "--allow-non-sqlite",
        action="store_true",
        help="allow a non-SQLite DATABASE_URL",
    )
    args = parser.parse_args()

    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith("sqlite") and not args.allow_non_sqlite:
        print("Refusing to run: set DATABASE_URL to a sqlite:/// URL.", file=sys.stderr)
        return 2

    from app.core.database import SessionLocal, drop_db, init_db
    from app.core.security import get_password_hash
    from app.models.database import (  # noqa: F401  (registers every table)
        WBS,
        AuditLog,
        BusinessArea,
        CostType,
        EstimatingTechnique,
        ExpenditureIndicator,
        ExpenseType,
        PMBWeight,
        ProbabilityLevel,
        Project,
        ProjectSourceFormat,
        ProjectStatus,
        Region,
        Resource,
        ResourceAssignment,
        Risk,
        RiskCategory,
        SeverityLevel,
        Supplier,
        User,
        UserRole,
    )
    from app.services.audit_service import AuditService

    if args.reset:
        drop_db()
    init_db()

    db = SessionLocal()
    try:
        # ---- users --------------------------------------------------------
        users = {}
        for u in DATA["users"]:
            row = db.query(User).filter_by(username=u["username"]).first()
            if not row:
                row = User(
                    username=u["username"],
                    email=u["email"],
                    full_name=u["full_name"],
                    role=UserRole(u["role"]),
                    hashed_password=get_password_hash(u["password"]),
                    is_active=True,
                    is_verified=True,
                )
                db.add(row)
                db.flush()
            users[u["username"]] = row

        # ---- config tables -----------------------------------------------
        plain = {
            "cost-types": CostType,
            "expense-types": ExpenseType,
            "regions": Region,
            "business-areas": BusinessArea,
            "estimating-techniques": EstimatingTechnique,
            "risk-categories": RiskCategory,
            "expenditure-indicators": ExpenditureIndicator,
        }
        weighted = {
            "probability-levels": ProbabilityLevel,
            "severity-levels": SeverityLevel,
            "pmb-weights": PMBWeight,
        }
        for table, model in plain.items():
            for code, desc in DATA["config"][table]:
                if not db.query(model).filter_by(code=code).first():
                    db.add(model(code=code, description=desc, is_active=True))
        for table, model in weighted.items():
            for code, desc, weight in DATA["config"][table]:
                if not db.query(model).filter_by(code=code).first():
                    db.add(
                        model(
                            code=code, description=desc, weight=weight, is_active=True
                        )
                    )

        # ---- resources and suppliers --------------------------------------
        for r in DATA["resources"]:
            if not db.query(Resource).filter_by(resource_code=r["code"]).first():
                db.add(
                    Resource(
                        resource_code=r["code"],
                        description=r["description"],
                        eoc=r["eoc"],
                        cost=r["cost"],
                        units=r["units"],
                    )
                )
        for s in DATA["suppliers"]:
            if not db.query(Supplier).filter_by(supplier_code=s["code"]).first():
                db.add(
                    Supplier(
                        supplier_code=s["code"],
                        name=s["name"],
                        contact=s["contact"],
                        email=s["email"],
                        phone=s["phone"],
                    )
                )
        db.flush()

        # ---- projects, WBS trees, assignments, risks ----------------------
        admin = users["smoke_admin"]
        start = datetime(2026, 1, 5)
        created_projects = []

        def add_wbs(project, nodes, parent, level):
            count = 0
            for i, node in enumerate(nodes):
                has_children = bool(node.get("children"))
                wbs = WBS(
                    project_id=project.id,
                    wbs_code=node["code"],
                    wbs_title=node["title"],
                    outline_level=level,
                    parent_id=parent.id if parent else None,
                    is_summary=has_children,
                    approval_status=node["approval"],
                    schedule_start=start + timedelta(days=30 * i),
                    schedule_finish=start + timedelta(days=30 * i + 25),
                    percent_complete=0.0,
                )
                if node["approval"] == "approved":
                    wbs.approver = "smoke_manager"
                    wbs.approver_date = datetime.utcnow()
                    wbs.estimate_revision = 1
                db.add(wbs)
                db.flush()
                count += 1
                for a in node.get("assignments", []):
                    db.add(
                        ResourceAssignment(
                            wbs_id=wbs.id,
                            resource_code=a["resource"],
                            supplier_code=a["supplier"],
                            cost_type_code=a["cost_type"],
                            region_code=a["region"],
                            bus_area_code=a["bus_area"],
                            estimating_technique_code=a["technique"],
                            best_estimate=a["best"],
                            likely_estimate=a["likely"],
                            worst_estimate=a["worst"],
                        )
                    )
                for r in node.get("risks", []):
                    db.add(_risk(r, wbs_id=wbs.id))
                count += add_wbs(project, node.get("children", []), wbs, level + 1)
            return count

        def _risk(r, wbs_id=None, project_id=None):
            return Risk(
                wbs_id=wbs_id,
                project_id=project_id,
                title=r["title"],
                status="open",
                risk_category_code=r["category"],
                risk_cost=r["cost"],
                probability_code=r["probability"],
                severity_code=r["severity"],
                mitigation_plan=r["mitigation"],
            )

        for p in DATA["projects"]:
            if db.query(Project).filter_by(project_name=p["name"]).first():
                continue
            project = Project(
                project_name=p["name"],
                project_manager=p["manager"],
                description=p["description"],
                status=ProjectStatus(p["status"]),
                source_format=ProjectSourceFormat.MANUAL,
                start_date=start,
                finish_date=start + timedelta(days=365),
                owner_id=admin.id,
            )
            db.add(project)
            db.flush()
            project.task_count = add_wbs(project, p["wbs"], None, 1)
            for r in p["project_risks"]:
                db.add(_risk(r, project_id=project.id))
            created_projects.append(project)
        db.commit()

        # ---- audit log entries --------------------------------------------
        marker = DATA["audit_seed_marker"]
        if not db.query(AuditLog).filter_by(user_agent=marker).first():
            audit = AuditService(db)
            for project in db.query(Project).all():
                audit.log_action(
                    "CREATE",
                    "Project",
                    user_id=admin.id,
                    entity_id=project.id,
                    new_values={"project_name": project.project_name},
                )
            for res in db.query(Resource).limit(3).all():
                audit.log_action(
                    "UPDATE",
                    "Resource",
                    user_id=users["smoke_manager"].id,
                    entity_id=res.id,
                    old_values={"cost": 1000},
                    new_values={"cost": float(res.cost)},
                )
            audit.log_action(
                "LOGIN",
                "User",
                user_id=users["smoke_user"].id,
                entity_id=users["smoke_user"].id,
            )
            audit.log_action(
                "FAILED_LOGIN",
                "User",
                entity_id=None,
                new_values={"username": "nobody"},
            )
            db.query(AuditLog).filter(AuditLog.user_agent.is_(None)).update(
                {"user_agent": marker}
            )
            db.commit()
    finally:
        db.close()

    print("Seed complete. Sign-in credentials:")
    for u in DATA["users"]:
        print(f"  {u['role']:<8} {u['username']:<14} {u['password']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
