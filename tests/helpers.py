"""Shared builders for route-level tests (users, auth headers, seeded project)."""

from decimal import Decimal

from app.core.security import create_access_token, get_password_hash
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
from app.models.database.resource import Resource, Supplier
from app.models.database.risk import Risk
from app.models.database.user import User, UserRole
from app.models.database.wbs import WBS

PASSWORD = "Passw0rd!pass"


def make_user(db, name: str, role: UserRole, active: bool = True) -> User:
    user = User(
        email=f"{name}@example.com",
        username=name,
        hashed_password=get_password_hash(PASSWORD),
        full_name=name.title(),
        role=role,
        is_active=active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def seed_config(db) -> None:
    """Minimal lookup data so FKs resolve and exposures are non-zero."""
    db.add_all(
        [
            CostType(code="LAB", description="Labour"),
            Region(code="VIC", description="Victoria"),
            Region(code="NSW", description="New South Wales"),
            BusinessArea(code="OPS", description="Operations"),
            EstimatingTechnique(code="EXP", description="Expert"),
            RiskCategory(code="TECH", description="Technical"),
            RiskCategory(code="COMM", description="Commercial"),
            ProbabilityLevel(code="HIGH", description="High", weight=Decimal("0.50")),
            SeverityLevel(code="MAJ", description="Major", weight=Decimal("0.50")),
            Resource(resource_code="ENG", description="Engineer", cost=Decimal("100")),
            Resource(resource_code="PM", description="Manager", cost=Decimal("150")),
            Supplier(supplier_code="ACME", name="Acme Pty Ltd"),
        ]
    )
    db.commit()


def seed_project(db) -> dict:
    """Project -> 2 root WBS, one child; 3 assignments; 2 WBS risks + 1 project risk.

    Exposure per risk with cost 1000 = 1000 * 0.5 * 0.5 = 250.
    """
    seed_config(db)
    project = Project(project_name="Harbour", project_manager="Pat")
    db.add(project)
    db.commit()
    root_a = WBS(project_id=project.id, wbs_code="1", wbs_title="Root A")
    root_b = WBS(project_id=project.id, wbs_code="2", wbs_title="Root B")
    db.add_all([root_a, root_b])
    db.commit()
    child = WBS(
        project_id=project.id,
        wbs_code="1.1",
        wbs_title="Child A1",
        parent_id=root_a.id,
        outline_level=1,
    )
    db.add(child)
    db.commit()

    def assign(wbs, res, best, likely, worst, region="VIC", supplier=None):
        a = ResourceAssignment(
            wbs_id=wbs.id,
            resource_code=res,
            supplier_code=supplier,
            cost_type_code="LAB",
            region_code=region,
            bus_area_code="OPS",
            estimating_technique_code="EXP",
            best_estimate=Decimal(best),
            likely_estimate=Decimal(likely),
            worst_estimate=Decimal(worst),
        )
        db.add(a)
        return a

    assign(root_a, "ENG", "100.00", "200.00", "400.00", supplier="ACME")
    assign(child, "PM", "10.00", "20.00", "50.00", region="NSW")
    assign(root_b, "ENG", "1.00", "1.00", "2.00")
    db.commit()

    def risk(title, wbs=None, project_id=None):
        r = Risk(
            title=title,
            wbs_id=wbs.id if wbs else None,
            project_id=project_id,
            risk_category_code="TECH",
            risk_cost=Decimal("1000.00"),
            probability_code="HIGH",
            severity_code="MAJ",
        )
        db.add(r)
        return r

    risk("wbs risk 1", wbs=root_a)
    risk("wbs risk 2", wbs=child)
    risk("project risk", project_id=project.id)
    db.commit()
    return {
        "project": project,
        "root_a": root_a,
        "root_b": root_b,
        "child": child,
    }


def iter_api_routes(routes=None):
    """Yield every concrete route (``.path`` and ``.methods``) of the app.

    Newer FastAPI versions keep included routers as lazy ``_IncludedRouter``
    nodes in ``app.routes``; older ones flatten them into ``APIRoute``s. Handle
    both so the route walk keeps working across the supported version range.
    """
    if routes is None:
        from app.main import app

        routes = app.routes
    for route in routes:
        if hasattr(route, "effective_route_contexts"):
            yield from route.effective_route_contexts()
        elif hasattr(route, "methods") and hasattr(route, "path"):
            yield route
        elif hasattr(route, "routes"):
            yield from iter_api_routes(route.routes)
