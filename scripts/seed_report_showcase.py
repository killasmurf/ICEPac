"""
Showcase test data for the ICEPac reporting subsystem.

A focused, idempotent dataset designed to demonstrate every feature
of the modernized reporting engine. Creates a dedicated showcase
project (separate from the existing demo data) that exercises:

  - PERT math (best/4*likely/worst) / 6 with both optimistic and
    pessimistic distributions
  - Standard deviation (worst - best) / 6
  - 80% confidence interval (PERT +/- 1.28 * std_dev)
  - Total cost aggregation across multiple rows
  - Empty-rows default behavior (totals = zeros, not None)
  - Risk exposure (cost * prob_weight * sev_weight)
  - All 5 export formats (JSON, CSV, PDF, XLSX, DOCX)
  - All 5 cost rollup dimensions (wbs, resource, supplier, eoc, technique)
  - Both risk reports (assessment, summary)
  - Both BOE reports (summary, detailed)
  - Resource utilization + project summary (when endpoints are added)
  - Audit log activity (estimator, change history)
  - Cost-type, region, technique, supplier coverage

The showcase project is named "Reporting Showcase (US-006)". Run this
script on an existing demo instance to add it without disturbing other
demo data; the script is idempotent (skips if the showcase project
already exists).

Usage:
  docker exec <app-container> python scripts/seed_report_showcase.py

Or with --force to wipe and reseed the showcase project:
  docker exec <app-container> python scripts/seed_report_showcase.py --force
"""
import argparse
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Project root on sys.path (idempotent)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.database.assignment import ResourceAssignment
from app.models.database.config_tables import (
    BusinessArea,
    CostType,
    EstimatingTechnique,
    ProbabilityLevel,
    Region,
    RiskCategory,
    SeverityLevel,
)
from app.models.database.project import Project
from app.models.database.resource import Resource
from app.models.database.risk import Risk
from app.models.database.wbs import WBS

SHOWCASE_PROJECT_NAME = "Reporting Showcase (US-006)"

# WBS items: 5 WBS items with varied PERT distributions to exercise the
# math. (wbs_code, wbs_title, best, likely, worst, baseline_cost)
WBS_ITEMS = [
    ("100", "Project Management", 12000, 15000, 20000, 15000.0),
    ("200", "Design & Engineering", 8000, 12000, 22000, 12000.0),
    ("300", "Procurement & Logistics", 18000, 22000, 30000, 22000.0),
    ("400", "Construction", 90000, 120000, 180000, 120000.0),
    ("500", "Commissioning & Closeout", 5000, 8000, 15000, 8000.0),
]

# Assignments: per WBS item, one optimistic + one pessimistic assignment
# (so the cost rollups show non-trivial std_dev variance).
# (wbs_code, resource_code, supplier_code, cost_type_code,
#  region_code, business_area_code, technique_code,
#  best, likely, worst, duty_pct)
ASSIGNMENTS = [
    # WBS 100 - Project Management
    (
        "100",
        "ENG-001",
        "ACME-CONST",
        "LABOR",
        "NE",
        "DESIGN",
        "THREE",
        8000,
        10000,
        14000,
        100.0,
    ),  # somewhat optimistic
    (
        "100",
        "TECH-002",
        "BUILDIT",
        "SUBK",
        "C",
        "PM",
        "BOTUP",
        4000,
        5000,
        6000,
        50.0,
    ),  # tight
    # WBS 200 - Design (pessimistic distribution)
    (
        "200",
        "ENG-001",
        "CONSULT-FIN",
        "SUBK",
        "W",
        "DESIGN",
        "EXPERT",
        4000,
        6000,
        12000,
        60.0,
    ),  # wide spread
    (
        "200",
        "ENG-005",
        "IT-EXPERT",
        "OTHER",
        "INTL",
        "IT",
        "ANALOG",
        4000,
        6000,
        10000,
        40.0,
    ),  # also wide
    # WBS 300 - Procurement
    (
        "300",
        "ADMIN-003",
        "MATDIRECT",
        "MATL",
        "N",
        "PROC",
        "VENDOR",
        12000,
        15000,
        20000,
        80.0,
    ),
    ("300", "TECH-001", "BUILDIT", "SUBK", "S", "PM", "PARAM", 6000, 7000, 10000, 20.0),
    # WBS 400 - Construction (the big-ticket item)
    (
        "400",
        "ENG-001",
        "ACME-CONST",
        "LABOR",
        "C",
        "CONST",
        "BOTUP",
        30000,
        45000,
        70000,
        100.0,
    ),  # wide (construction risk)
    (
        "400",
        "ENG-002",
        "ACME-CONST",
        "LABOR",
        "C",
        "CONST",
        "BOTUP",
        20000,
        28000,
        42000,
        100.0,
    ),
    (
        "400",
        "TECH-003",
        "PREMIER-BLD",
        "SUBK",
        "C",
        "CONST",
        "BOTUP",
        25000,
        30000,
        50000,
        100.0,
    ),
    (
        "400",
        "ENG-003",
        "BUILDIT",
        "SUBK",
        "E",
        "CONST",
        "PARAM",
        15000,
        17000,
        22000,
        100.0,
    ),
    # WBS 500 - Commissioning (small, optimistic)
    (
        "500",
        "SPEC-003",
        "IT-EXPERT",
        "OTHER",
        "INTL",
        "OPS",
        "ANALOG",
        1500,
        2200,
        3000,
        40.0,
    ),
    ("500", "SPEC-002", "BUILDIT", "SUBK", "C", "OPS", "BOTUP", 2000, 3000, 5500, 30.0),
    (
        "500",
        "ADMIN-001",
        "ACME-CONST",
        "LABOR",
        "C",
        "OPS",
        "BOTUP",
        1500,
        2800,
        6500,
        30.0,
    ),
]

# WBS-scoped risks: 1 risk per WBS item, with varied prob × sev × cost
# (wbs_code, title, risk_category, prob, sev, cost, mitigation, days_ago)
WBS_RISKS = [
    (
        "100",
        "Schedule slip on management phase",
        "SCHED",
        "L",
        "H",
        8000,
        "Hire additional PM support; lock decision deadlines.",
        60,
    ),
    (
        "200",
        "Geotechnical surprises during design",
        "TECH",
        "M",
        "VH",
        25000,
        "Pre-drill 3 boreholes; geotech contingency in design budget.",
        90,
    ),
    (
        "300",
        "Long-lead equipment delivery delay",
        "SCHED",
        "H",
        "H",
        45000,
        "Issue POs 6 months early; dual-source critical items.",
        30,
    ),
    (
        "400",
        "Weather delays on exterior work",
        "ENV",
        "VH",
        "M",
        60000,
        "Build 30-day weather buffer; reschedule exterior in storm season.",
        14,
    ),
    (
        "500",
        "Commissioning punch list overruns",
        "QUAL",
        "M",
        "M",
        9000,
        "Pre-commission critical systems 2 weeks early.",
        7,
    ),
]

# Project-level risks: 3 cross-cutting risks at the project level
# (title, risk_category, prob, sev, cost, mitigation, days_ago)
PROJECT_RISKS = [
    (
        "Regulatory approval slip (Joint Commission survey delay)",
        "REG",
        "M",
        "H",
        48000,
        "Submit survey request 6 months early.",
        120,
    ),
    (
        "Specialized medical equipment lead time (MRI / surgical booms)",
        "SCHED",
        "H",
        "H",
        38000,
        "Issue POs with deposit; dual-source.",
        60,
    ),
    (
        "Specialty trade coordination conflict",
        "QUAL",
        "M",
        "M",
        14000,
        "Hold BIM kickoff; lock sequence in writing.",
        30,
    ),
]


def _ensure_lookup(db: Session, model, code: str, description: str = ""):
    """Idempotent: get or create a lookup-table row by code.

    Uses a minimal column projection so the existence check works
    even on older DB schemas that may be missing newer model columns
    (e.g. is_active). The existence query only needs the primary key.
    """
    pk_name = "id"
    existing = db.query(getattr(model, pk_name)).filter(model.code == code).first()
    if existing is not None:
        return existing
    new = model(code=code, description=description)
    db.add(new)
    db.flush()
    return new


def _ensure_probability(
    db: Session, code: str, description: str, sort_order: int, weight
):
    existing = (
        db.query(ProbabilityLevel.id).filter(ProbabilityLevel.code == code).first()
    )
    if existing is not None:
        return existing
    new = ProbabilityLevel(
        code=code, description=description, sort_order=sort_order, weight=weight
    )
    db.add(new)
    db.flush()
    return new


def _ensure_severity(db: Session, code: str, description: str, sort_order: int, weight):
    existing = db.query(SeverityLevel.id).filter(SeverityLevel.code == code).first()
    if existing is not None:
        return existing
    new = SeverityLevel(
        code=code, description=description, sort_order=sort_order, weight=weight
    )
    db.add(new)
    db.flush()
    return new


def _ensure_resources(db: Session):
    """Seed the 5 resources used by the showcase assignments."""
    from app.models.database.resource import Resource

    resources_data = [
        ("ENG-001", "Senior Structural Engineer", "LABOR", 175.0),
        ("ENG-002", "Junior Structural Engineer", "LABOR", 95.0),
        ("ENG-003", "Mechanical Engineer (HVAC)", "LABOR", 145.0),
        ("ENG-005", "Civil/Geotechnical Engineer", "LABOR", 155.0),
        ("TECH-001", "Senior Project Manager", "LABOR", 185.0),
        ("TECH-002", "Project Manager", "LABOR", 145.0),
        ("TECH-003", "Construction Superintendent", "LABOR", 165.0),
        ("SPEC-002", "Quality Inspector", "LABOR", 95.0),
        ("SPEC-003", "Safety Officer", "LABOR", 105.0),
        ("ADMIN-001", "Project Coordinator", "LABOR", 75.0),
        ("ADMIN-003", "Document Controller", "LABOR", 65.0),
    ]
    for code, desc, eoc, cost in resources_data:
        existing = db.query(Resource.id).filter(Resource.resource_code == code).first()
        if existing is None:
            db.add(
                Resource(
                    resource_code=code,
                    description=desc,
                    eoc=eoc,
                    cost=Decimal(str(cost)),
                    units="hours",
                )
            )
    db.flush()


def _ensure_suppliers(db: Session):
    """Seed the suppliers used by the showcase assignments."""
    from app.models.database.resource import Supplier

    suppliers_data = [
        ("ACME-CONST", "Acme Construction Inc.", "John Smith"),
        ("BUILDIT", "BuildIt Contractors Ltd.", "Jane Doe"),
        ("PREMIER-BLD", "Premier Builders Group", "Bob Wilson"),
        ("MATDIRECT", "Materials Direct Supply", "Alice Chen"),
        ("CONSULT-FIN", "Consulting Financial Partners", "David Lee"),
        ("IT-EXPERT", "IT Experts Inc.", "Mike Brown"),
    ]
    for code, name, contact in suppliers_data:
        existing = db.query(Supplier.id).filter(Supplier.supplier_code == code).first()
        if existing is None:
            db.add(Supplier(supplier_code=code, name=name, contact=contact))
    db.flush()


def _ensure_config_tables(db: Session):
    """Seed the lookup tables used by the showcase (lookup rows must exist
    before Risk / ResourceAssignment rows are inserted because of FKs)."""
    for code, desc in [
        ("LABOR", "Direct Labor"),
        ("MATL", "Materials"),
        ("SUBK", "Subcontractor"),
        ("EQUIP", "Equipment"),
        ("OTHER", "Other Direct"),
    ]:
        _ensure_lookup(db, CostType, code, desc)

    for code, desc in [
        ("N", "North"),
        ("S", "South"),
        ("E", "East"),
        ("W", "West"),
        ("C", "Central"),
        ("INTL", "International"),
    ]:
        _ensure_lookup(db, Region, code, desc)

    for code, desc in [
        ("DESIGN", "Design & Engineering"),
        ("CONST", "Construction"),
        ("OPS", "Operations"),
        ("PM", "Project Management"),
        ("PROC", "Procurement"),
        ("IT", "IT"),
    ]:
        _ensure_lookup(db, BusinessArea, code, desc)

    for code, desc in [
        ("ANALOG", "Analogous Estimating"),
        ("PARAM", "Parametric Estimating"),
        ("BOTUP", "Bottom-Up Estimating"),
        ("THREE", "Three-Point (PERT) Estimating"),
        ("EXPERT", "Expert Judgment"),
        ("VENDOR", "Vendor Quote Analysis"),
    ]:
        _ensure_lookup(db, EstimatingTechnique, code, desc)

    for code, desc in [
        ("TECH", "Technical"),
        ("FIN", "Financial"),
        ("SCHED", "Schedule"),
        ("ENV", "Environmental"),
        ("QUAL", "Quality"),
        ("REG", "Regulatory/Compliance"),
        ("SAFETY", "Health & Safety"),
    ]:
        _ensure_lookup(db, RiskCategory, code, desc)

    # Probability levels: weight = probability (0.2 to 1.0)
    _ensure_probability(db, "VL", "Very Low", 1, Decimal("0.2"))
    _ensure_probability(db, "L", "Low", 2, Decimal("0.4"))
    _ensure_probability(db, "M", "Medium", 3, Decimal("0.6"))
    _ensure_probability(db, "H", "High", 4, Decimal("0.8"))
    _ensure_probability(db, "VH", "Very High", 5, Decimal("1.0"))

    # Severity levels
    _ensure_severity(db, "VL", "Negligible", 1, Decimal("0.2"))
    _ensure_severity(db, "L", "Minor", 2, Decimal("0.4"))
    _ensure_severity(db, "M", "Moderate", 3, Decimal("0.6"))
    _ensure_severity(db, "H", "Major", 4, Decimal("0.8"))
    _ensure_severity(db, "VH", "Severe/Critical", 5, Decimal("1.0"))


def _project_exists(db: Session, name: str) -> bool:
    # Use a minimal column list so the query works even on older DB
    # schemas that don't have the latest Project columns
    # (e.g. source_file, status, start_date, etc.). The DB schema
    # can drift ahead of the test environment; querying only `id` and
    # `project_name` keeps the existence check robust.
    return (
        db.query(Project.id, Project.project_name)
        .filter(Project.project_name == name)
        .first()
        is not None
    )


def seed_showcase(force: bool = False) -> dict:
    """Idempotent: returns a dict of counts (added / skipped)."""
    db: Session = SessionLocal()
    try:
        if _project_exists(db, SHOWCASE_PROJECT_NAME):
            if not force:
                print(
                    f"  Showcase project already exists. Skipping (use --force to wipe)."
                )
                return {"skipped": True}
            print(f"  --force: wiping showcase data...")
            # Use minimal column list for the same reason as _project_exists
            proj = (
                db.query(Project.id, Project.project_name)
                .filter(Project.project_name == SHOWCASE_PROJECT_NAME)
                .first()
            )
            # Fetch the actual Project instance to delete (need all columns
            # for the cascade delete, which happens via SQLAlchemy ORM)
            proj_obj = db.get(Project, proj.id)
            # WBS cascade-deletes WBS-scoped risks and assignments
            db.delete(proj_obj)
            db.commit()

        print(f"  Seeding lookup tables...")
        _ensure_config_tables(db)
        _ensure_resources(db)
        _ensure_suppliers(db)
        db.commit()

        # ---- Project + WBS items
        print(f"  Seeding project + {len(WBS_ITEMS)} WBS items...")
        project = Project(
            project_name=SHOWCASE_PROJECT_NAME,
            project_manager="US-006 Showcase",
            description=(
                "Dedicated showcase dataset for the reporting subsystem. "
                "Exercises every functional report endpoint with non-trivial "
                "PERT distributions, risk exposures, and cost aggregations."
            ),
            archived=False,
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        wbs_by_code: dict[str, WBS] = {}
        for code, title, best, likely, worst, baseline in WBS_ITEMS:
            wbs = WBS(
                project_id=project.id,
                wbs_code=code,
                wbs_title=title,
            )
            db.add(wbs)
            db.commit()
            db.refresh(wbs)
            wbs_by_code[code] = wbs

        # ---- Assignments (the cost rollup data)
        print(
            f"  Seeding {len(ASSIGNMENTS)} assignments (varied PERT distributions)..."
        )
        for (
            wbs_code,
            res_code,
            supp_code,
            cost_type_code,
            region_code,
            ba_code,
            tech_code,
            best,
            likely,
            worst,
            duty_pct,
        ) in ASSIGNMENTS:
            # Minimal column projection so the existence check works
            # on older DB schemas (avoid pulling columns that may not
            # exist yet, like new ResourceAssignment fields).
            wbs_obj = (
                db.query(WBS.id, WBS.wbs_code)
                .filter(WBS.wbs_code == wbs_code, WBS.project_id == project.id)
                .first()
            )
            if wbs_obj is None:
                continue
            db.add(
                ResourceAssignment(
                    wbs_id=wbs_obj.id,
                    resource_code=res_code,
                    supplier_code=supp_code,
                    cost_type_code=cost_type_code,
                    region_code=region_code,
                    bus_area_code=ba_code,
                    estimating_technique_code=tech_code,
                    best_estimate=Decimal(str(best)),
                    likely_estimate=Decimal(str(likely)),
                    worst_estimate=Decimal(str(worst)),
                    duty_pct=Decimal(str(duty_pct)),
                    import_content_pct=Decimal("0"),
                    aii_pct=Decimal("0"),
                )
            )
        db.commit()

        # ---- WBS-scoped risks
        print(f"  Seeding {len(WBS_RISKS)} WBS-scoped risks...")
        for (
            wbs_code,
            title,
            cat,
            prob,
            sev,
            cost,
            mit,
            days_ago,
        ) in WBS_RISKS:
            wbs_obj = (
                db.query(WBS.id, WBS.wbs_code)
                .filter(WBS.wbs_code == wbs_code, WBS.project_id == project.id)
                .first()
            )
            if wbs_obj is None:
                continue
            db.add(
                Risk(
                    wbs_id=wbs_obj.id,
                    title=title,
                    risk_category_code=cat,
                    probability_code=prob,
                    severity_code=sev,
                    risk_cost=Decimal(str(cost)),
                    mitigation_plan=mit,
                    date_identified=datetime.utcnow() - timedelta(days=days_ago),
                    status="open",
                )
            )

        # ---- Project-level risks
        print(f"  Seeding {len(PROJECT_RISKS)} project-level risks...")
        for (
            title,
            cat,
            prob,
            sev,
            cost,
            mit,
            days_ago,
        ) in PROJECT_RISKS:
            db.add(
                Risk(
                    project_id=project.id,
                    title=title,
                    risk_category_code=cat,
                    probability_code=prob,
                    severity_code=sev,
                    risk_cost=Decimal(str(cost)),
                    mitigation_plan=mit,
                    date_identified=datetime.utcnow() - timedelta(days=days_ago),
                    status="open",
                )
            )

        db.commit()

        return {
            "skipped": False,
            "project_id": project.id,
            "wbs_items": len(WBS_ITEMS),
            "assignments": len(ASSIGNMENTS),
            "wbs_risks": len(WBS_RISKS),
            "project_risks": len(PROJECT_RISKS),
        }
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        action="store_true",
        help="Wipe and reseed the showcase project",
    )
    args = parser.parse_args()

    result = seed_showcase(force=args.force)
    if result.get("skipped"):
        print(f"seed_report_showcase: skipped (already exists). Use --force to wipe.")
        sys.exit(0)
    print(f"seed_report_showcase: complete.")
    for k, v in result.items():
        print(f"  {k:20} {v}")
    sys.exit(0)
