"""Unit tests for ProjectService and EstimationService."""
import pytest
from decimal import Decimal
from fastapi import HTTPException

from app.models.schemas.project import ProjectCreate, ProjectUpdate, WBSCreate, WBSUpdate
from app.models.schemas.estimation import AssignmentCreate, AssignmentUpdate, RiskCreate
from app.services.project_service import ProjectService
from app.services.estimation_service import EstimationService


# ---------------------------------------------------------------------------
# ProjectService tests
# ---------------------------------------------------------------------------

class TestProjectService:

    def test_create_project(self, db):
        svc = ProjectService(db)
        project = svc.create(ProjectCreate(project_name="Alpha", project_manager="Alice"))
        assert project.id is not None
        assert project.project_name == "Alpha"
        assert project.archived is False

    def test_get_project(self, db):
        svc = ProjectService(db)
        created = svc.create(ProjectCreate(project_name="Beta"))
        fetched = svc.get(created.id)
        assert fetched is not None
        assert fetched.id == created.id

    def test_get_missing_project_returns_none(self, db):
        svc = ProjectService(db)
        assert svc.get(999) is None

    def test_get_or_404_raises_on_missing(self, db):
        svc = ProjectService(db)
        with pytest.raises(HTTPException) as exc_info:
            svc.get_or_404(999)
        assert exc_info.value.status_code == 404

    def test_update_project(self, db):
        svc = ProjectService(db)
        project = svc.create(ProjectCreate(project_name="Gamma"))
        updated = svc.update(project.id, ProjectUpdate(project_name="Gamma v2"))
        assert updated.project_name == "Gamma v2"

    def test_archive_project(self, db):
        svc = ProjectService(db)
        project = svc.create(ProjectCreate(project_name="Delta"))
        archived = svc.archive(project.id)
        assert archived.archived is True

    def test_delete_project(self, db):
        svc = ProjectService(db)
        project = svc.create(ProjectCreate(project_name="Epsilon"))
        result = svc.delete(project.id)
        assert result is True
        assert svc.get(project.id) is None

    def test_list_active_projects_excludes_archived(self, db):
        svc = ProjectService(db)
        svc.create(ProjectCreate(project_name="Active"))
        archived = svc.create(ProjectCreate(project_name="Archived"))
        svc.archive(archived.id)

        active = svc.get_multi(active_only=True)
        names = [p.project_name for p in active]
        assert "Active" in names
        assert "Archived" not in names

    def test_create_wbs_item(self, db):
        svc = ProjectService(db)
        project = svc.create(ProjectCreate(project_name="WBSTest"))
        wbs = svc.create_wbs(project.id, WBSCreate(wbs_title="Task 1", wbs_code="1.0"))
        assert wbs.id is not None
        assert wbs.project_id == project.id
        assert wbs.wbs_title == "Task 1"

    def test_create_wbs_on_missing_project_raises(self, db):
        svc = ProjectService(db)
        with pytest.raises(HTTPException) as exc_info:
            svc.create_wbs(999, WBSCreate(wbs_title="Orphan"))
        assert exc_info.value.status_code == 404

    def test_get_wbs_by_project(self, db):
        svc = ProjectService(db)
        project = svc.create(ProjectCreate(project_name="WBSList"))
        svc.create_wbs(project.id, WBSCreate(wbs_title="Item A"))
        svc.create_wbs(project.id, WBSCreate(wbs_title="Item B"))

        items = svc.get_wbs_by_project(project.id)
        assert len(items) == 2

    def test_import_from_mpp(self, db, sample_tasks):
        svc = ProjectService(db)
        project, count = svc.import_from_mpp("Imported Project", sample_tasks)
        assert project.id is not None
        assert project.project_name == "Imported Project"
        assert count == 3

        wbs_items = svc.get_wbs_by_project(project.id)
        assert len(wbs_items) == 3
        titles = {w.wbs_title for w in wbs_items}
        assert "Design Phase" in titles

    def test_import_skips_blank_task_names(self, db):
        svc = ProjectService(db)
        tasks = [
            {"id": 1, "name": "Real Task", "start": None, "finish": None},
            {"id": 2, "name": "", "start": None, "finish": None},
            {"id": 3, "name": "   ", "start": None, "finish": None},
        ]
        _, count = svc.import_from_mpp("Sparse", tasks)
        assert count == 1


# ---------------------------------------------------------------------------
# EstimationService tests
# ---------------------------------------------------------------------------

class TestEstimationService:

    def _make_project_with_wbs(self, db):
        psvc = ProjectService(db)
        project = psvc.create(ProjectCreate(project_name="EstProject"))
        wbs = psvc.create_wbs(project.id, WBSCreate(wbs_title="WBS 1"))
        return project, wbs

    def _make_resource(self, db, code="RES001"):
        """Insert a minimal resource row so FK constraints pass."""
        from app.models.database.resource import Resource
        r = Resource(resource_code=code, description="Test Resource")
        db.add(r)
        db.commit()
        db.refresh(r)
        return r

    def test_create_assignment(self, db):
        project, wbs = self._make_project_with_wbs(db)
        self._make_resource(db, "R1")
        svc = EstimationService(db)
        a = svc.create_assignment(
            project.id, wbs.id,
            AssignmentCreate(
                resource_code="R1",
                best_estimate=Decimal("100"),
                likely_estimate=Decimal("150"),
                worst_estimate=Decimal("200"),
            )
        )
        assert a.id is not None
        assert a.wbs_id == wbs.id

    def test_pert_estimate_calculation(self, db):
        project, wbs = self._make_project_with_wbs(db)
        self._make_resource(db, "R2")
        svc = EstimationService(db)
        a = svc.create_assignment(
            project.id, wbs.id,
            AssignmentCreate(
                resource_code="R2",
                best_estimate=Decimal("10"),
                likely_estimate=Decimal("20"),
                worst_estimate=Decimal("30"),
            )
        )
        # PERT = (10 + 4*20 + 30) / 6 = 120/6 = 20.0
        assert abs(a.pert_estimate - 20.0) < 0.001
        # Std dev = (30 - 10) / 6 ≈ 3.333
        assert abs(a.std_deviation - (20 / 6)) < 0.001

    def test_list_assignments(self, db):
        project, wbs = self._make_project_with_wbs(db)
        self._make_resource(db, "RA")
        self._make_resource(db, "RB")
        svc = EstimationService(db)
        svc.create_assignment(project.id, wbs.id, AssignmentCreate(resource_code="RA"))
        svc.create_assignment(project.id, wbs.id, AssignmentCreate(resource_code="RB"))
        items = svc.list_assignments(project.id, wbs.id)
        assert len(items) == 2

    def test_delete_assignment(self, db):
        project, wbs = self._make_project_with_wbs(db)
        self._make_resource(db, "RC")
        svc = EstimationService(db)
        a = svc.create_assignment(project.id, wbs.id, AssignmentCreate(resource_code="RC"))
        svc.delete_assignment(project.id, wbs.id, a.id)
        assert svc.list_assignments(project.id, wbs.id) == []

    def test_create_risk(self, db):
        project, wbs = self._make_project_with_wbs(db)
        svc = EstimationService(db)
        risk = svc.create_risk(
            project.id, wbs.id,
            RiskCreate(risk_cost=Decimal("5000"), mitigation_plan="Buy insurance")
        )
        assert risk.id is not None
        assert risk.wbs_id == wbs.id
        assert risk.risk_cost == Decimal("5000")

    def test_project_estimate_summary_totals(self, db):
        project, wbs = self._make_project_with_wbs(db)
        self._make_resource(db, "RS")
        svc = EstimationService(db)
        svc.create_assignment(
            project.id, wbs.id,
            AssignmentCreate(
                resource_code="RS",
                best_estimate=Decimal("100"),
                likely_estimate=Decimal("200"),
                worst_estimate=Decimal("300"),
            )
        )
        svc.create_risk(
            project.id, wbs.id,
            RiskCreate(risk_cost=Decimal("50"))
        )

        summary = svc.project_estimate_summary(project.id)
        assert summary.project_id == project.id
        assert summary.total_best == Decimal("100")
        assert summary.total_worst == Decimal("300")
        assert summary.total_risk_cost == Decimal("50")
        assert len(summary.wbs_summaries) == 1

    def test_assignment_on_wrong_wbs_raises(self, db):
        project, wbs = self._make_project_with_wbs(db)
        svc = EstimationService(db)
        with pytest.raises(HTTPException) as exc_info:
            svc.list_assignments(project.id, wbs_id=9999)
        assert exc_info.value.status_code == 404
