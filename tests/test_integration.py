"""Phase 6 Integration Tests - Cross-circuit end-to-end verification.

Run with: pytest tests/test_integration.py -v
"""
import math
import csv
import io
import os
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_wbs_items():
    items = []
    for i, (code, title, parent) in enumerate([
        ("1.0", "Project Management", None), ("2.0", "Engineering", None),
        ("2.1", "Design", 2), ("2.2", "Development", 2), ("3.0", "Testing", None),
    ], 1):
        wbs = MagicMock()
        wbs.id = i; wbs.project_id = 1; wbs.wbs_code = code
        wbs.title = title; wbs.parent_id = parent; wbs.approval_status = "draft"
        items.append(wbs)
    return items

@pytest.fixture
def sample_report_result():
    from app.models.schemas.report import ReportResult
    return ReportResult(
        report_type="cost_by_wbs", title="Test Report",
        generated_at=datetime(2026, 4, 26), project_name="Test Project",
        filters_applied={"project_id": 1},
        columns=[{"key": "group_label", "label": "WBS"}, {"key": "pert_total", "label": "PERT ($)"}],
        rows=[{"group_label": "1.0 - PM", "pert_total": 15000}, {"group_label": "2.0 - Eng", "pert_total": 75000}],
        totals={"pert_total": 90000}, row_count=2,
    )


class TestProjectToEstimationFlow:
    def test_wbs_hierarchy(self, mock_wbs_items):
        ids = {w.id for w in mock_wbs_items}
        for wbs in mock_wbs_items:
            if wbs.parent_id is not None:
                assert wbs.parent_id in ids

    def test_approval_status(self, mock_wbs_items):
        valid = {"draft", "submitted", "approved", "rejected"}
        for wbs in mock_wbs_items:
            assert wbs.approval_status in valid


class TestEstimationToReportsFlow:
    def test_pert_formula(self):
        best, likely, worst = 10000, 15000, 25000
        assert round((best + 4 * likely + worst) / 6, 2) == 15833.33

    def test_confidence_interval(self):
        pert, std_dev, z = 15833.33, 2500.0, 1.28
        assert round(pert - z * std_dev, 2) == 12633.33
        assert round(pert + z * std_dev, 2) == 19033.33

    def test_combined_std_dev_is_rss(self):
        std_devs = [2500, 5000, 8000]
        combined = math.sqrt(sum(s ** 2 for s in std_devs))
        assert combined < sum(std_devs) and combined > max(std_devs)

    @patch("app.services.report_engine.ReportRepository")
    def test_empty_project_report(self, MockRepo):
        from app.services.report_engine import ReportEngine
        from app.models.schemas.report import ReportRequest, ReportFilter, ReportType
        mock_repo = MockRepo.return_value
        mock_repo.cost_by_wbs.return_value = []
        mock_repo.get_project_name.return_value = "Empty"
        engine = ReportEngine.__new__(ReportEngine)
        engine.repo = mock_repo
        result = engine.generate(ReportRequest(report_type=ReportType.COST_BY_WBS, filters=ReportFilter(project_id=1)))
        assert result.row_count == 0


class TestReportsToExportFlow:
    def test_all_formats(self, sample_report_result):
        from app.services.report_exporters import ReportExporter
        from app.models.schemas.report import ExportFormat
        for fmt in [ExportFormat.CSV, ExportFormat.XLSX, ExportFormat.PDF, ExportFormat.DOCX]:
            content, ct, fn = ReportExporter.export(sample_report_result, fmt)
            assert len(content) > 0 and fn.endswith(f".{fmt.value}")

    def test_csv_round_trip(self, sample_report_result):
        from app.services.report_exporters import CSVExporter
        content, _, _ = CSVExporter.export(sample_report_result, "test")
        rows = list(csv.reader(io.StringIO(content.decode("utf-8"))))
        assert rows[0] == ["WBS", "PERT ($)"] and len(rows) >= 3

    def test_pdf_valid(self, sample_report_result):
        from app.services.report_exporters import PDFExporter
        content, _, _ = PDFExporter.export(sample_report_result, "test")
        assert content[:4] == b"%PDF"


class TestAdminConfigFlow:
    def test_config_tables_complete(self):
        from app.models.database.config_tables import ALL_CONFIG_MODELS
        for t in ["cost-types", "regions", "estimating-techniques", "risk-categories", "probability-levels", "severity-levels"]:
            assert t in ALL_CONFIG_MODELS

    def test_weighted_tables_have_weight(self):
        from app.models.database.config_tables import WEIGHTED_CONFIG_MODELS
        for name in WEIGHTED_CONFIG_MODELS:
            assert hasattr(WEIGHTED_CONFIG_MODELS[name], "weight")


class TestFeatureFlags:
    def test_circuit_flags(self):
        from app.services.feature_flags import DEFAULT_FLAGS
        for c in ["help", "admin", "projects", "estimation", "reports"]:
            assert f"circuit.{c}" in DEFAULT_FLAGS

    def test_export_flags(self):
        from app.services.feature_flags import DEFAULT_FLAGS
        for fmt in ["pdf", "xlsx", "docx", "csv"]:
            assert f"feature.export_{fmt}" in DEFAULT_FLAGS

    def test_defaults_enabled(self):
        from app.services.feature_flags import DEFAULT_FLAGS
        for flag, val in DEFAULT_FLAGS.items():
            assert val is True, f"{flag} disabled"


class TestCacheKeys:
    def test_builders(self):
        from app.services.cache_service import project_key, project_list_key, wbs_list_key
        assert project_key(1) == "project:1"
        assert project_list_key(0, 20, True) == "projects:list:0:20:active=True"
        assert wbs_list_key(1) == "project:1:wbs"

    def test_uniqueness(self):
        from app.services.cache_service import project_key, project_list_key
        assert project_key(1) != project_key(2)
        assert project_list_key(0, 20, True) != project_list_key(0, 20, False)


class TestSchemaConsistency:
    def test_report_types_in_catalog(self):
        from app.models.schemas.report import ReportType, REPORT_CATALOG
        catalog_types = {r["type"] for cat in REPORT_CATALOG.values() for r in cat["reports"]}
        for rt in ReportType:
            assert rt.value in catalog_types

    def test_report_columns_defined(self):
        from app.models.schemas.report import ReportType
        from app.services.report_engine import REPORT_COLUMNS
        for rt in ReportType:
            assert rt in REPORT_COLUMNS

    def test_report_handlers_defined(self):
        from app.models.schemas.report import ReportType
        from app.services.report_engine import REPORT_HANDLERS, AUDIT_HANDLERS
        for rt in ReportType:
            assert rt in REPORT_HANDLERS or rt in AUDIT_HANDLERS


class TestModelRegistry:
    def test_all_models_importable(self):
        from app.models.database import (
            User, Project, WBS, Resource, Supplier, ResourceAssignment,
            Risk, ImportJob, ReportJob, AuditLog, CostType, Region,
            ProbabilityLevel, SeverityLevel, HelpTopic, HelpCategory,
        )
        assert User.__tablename__ == "users"
        assert ReportJob.__tablename__ == "report_jobs"

    def test_all_models_have_id(self):
        from app.models.database import (
            User, Project, WBS, Resource, Supplier, ResourceAssignment,
            Risk, ImportJob, ReportJob, AuditLog,
        )
        for m in [User, Project, WBS, Resource, Supplier,
                  ResourceAssignment, Risk, ImportJob, ReportJob, AuditLog]:
            assert hasattr(m, "id")


class TestMigrationChain:
    def test_chain_integrity(self):
        vdir = os.path.join(os.path.dirname(__file__), "..", "alembic", "versions")
        if not os.path.isdir(vdir):
            pytest.skip("alembic/versions not found")
        chain = {}
        for fn in os.listdir(vdir):
            if fn.endswith(".py") and not fn.startswith("__"):
                with open(os.path.join(vdir, fn)) as fh:
                    rev = down = None
                    for line in fh:
                        s = line.strip()
                        if s.startswith("revision ="):
                            rev = s.split("=", 1)[1].strip().strip(chr(34)).strip(chr(39))
                        elif s.startswith("Revision ID:"):
                            rev = s.split(":", 1)[1].strip()
                        if s.startswith("down_revision ="):
                            down = s.split("=", 1)[1].strip().strip(chr(34)).strip(chr(39))
                        elif s.startswith("Revises:"):
                            down = s.split(":", 1)[1].strip()
                    if rev:
                        chain[rev] = down
        for rev, down in chain.items():
            if down and down not in ("None", ""):
                assert down in chain, f"{rev} references missing {down}"
