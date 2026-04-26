"""Phase 5 Report Engine - Comprehensive Unit Tests."""
import math
import pytest
from datetime import datetime, date
from unittest.mock import MagicMock, patch, PropertyMock
from decimal import Decimal

from app.models.schemas.report import (
    ReportRequest, ReportFilter, ReportType, ExportFormat,
    ReportResult, REPORT_CATALOG, CostBreakdownRow,
)


# ════════════════════════════════════════════════════════════════
# Fixtures
# ════════════════════════════════════════════════════════════════

@pytest.fixture
def sample_filter():
    return ReportFilter(project_id=1)

@pytest.fixture
def sample_request(sample_filter):
    return ReportRequest(
        report_type=ReportType.COST_BY_WBS,
        filters=sample_filter,
        export_format=ExportFormat.JSON,
    )

@pytest.fixture
def sample_cost_rows():
    return [
        {"group_key": "1", "group_label": "1.0 - Project Management",
         "best_total": 10000, "likely_total": 15000, "worst_total": 25000,
         "pert_total": 15833.33, "std_dev": 2500, "confidence_80_low": 12633.33,
         "confidence_80_high": 19033.33, "assignment_count": 5},
        {"group_key": "2", "group_label": "2.0 - Engineering",
         "best_total": 50000, "likely_total": 75000, "worst_total": 120000,
         "pert_total": 78333.33, "std_dev": 11666.67, "confidence_80_low": 63400,
         "confidence_80_high": 93266.67, "assignment_count": 12},
    ]

@pytest.fixture
def sample_result(sample_cost_rows):
    return ReportResult(
        report_type="cost_by_wbs",
        title="Cost by WBS",
        generated_at=datetime(2026, 4, 26),
        project_name="Test Project",
        filters_applied={"project_id": 1},
        columns=[
            {"key": "group_label", "label": "WBS Item"},
            {"key": "pert_total", "label": "PERT ($)"},
            {"key": "std_dev", "label": "Std Dev"},
        ],
        rows=sample_cost_rows,
        totals={"pert_total": 94166.66, "std_dev": 14166.67, "assignment_count": 17},
        row_count=2,
    )


# ════════════════════════════════════════════════════════════════
# Schema Tests
# ════════════════════════════════════════════════════════════════

class TestReportSchemas:

    def test_report_types_enum(self):
        assert len(ReportType) == 16
        assert ReportType.COST_BY_WBS.value == "cost_by_wbs"
        assert ReportType.BOE_SUMMARY.value == "boe_summary"
        assert ReportType.RISK_ASSESSMENT.value == "risk_assessment"

    def test_export_formats(self):
        assert len(ExportFormat) == 5
        assert ExportFormat.PDF.value == "pdf"
        assert ExportFormat.XLSX.value == "xlsx"

    def test_report_catalog_completeness(self):
        all_types = set()
        for cat in REPORT_CATALOG.values():
            assert "label" in cat
            assert "reports" in cat
            for r in cat["reports"]:
                assert "type" in r
                assert "label" in r
                assert "description" in r
                all_types.add(r["type"])
        assert len(all_types) == 16

    def test_filter_defaults(self):
        f = ReportFilter(project_id=1)
        assert f.project_id == 1
        assert f.date_from is None
        assert f.include_inactive is False
        assert f.wbs_ids is None

    def test_filter_with_all_params(self):
        f = ReportFilter(
            project_id=1, date_from=date(2026, 1, 1), date_to=date(2026, 12, 31),
            wbs_ids=[1, 2, 3], cost_type_codes=["LABOR"],
            approval_status="approved", include_inactive=True,
        )
        assert len(f.wbs_ids) == 3
        assert f.approval_status == "approved"

    def test_report_request_defaults(self):
        req = ReportRequest(
            report_type=ReportType.COST_BY_WBS,
            filters=ReportFilter(project_id=1),
        )
        assert req.export_format == ExportFormat.JSON
        assert req.include_charts is False
        assert req.title is None

    def test_cost_breakdown_row(self):
        row = CostBreakdownRow(
            group_key="LABOR", group_label="Labor",
            best_total=1000, likely_total=1500, worst_total=2500,
            pert_total=1583.33, std_dev=250, assignment_count=3,
        )
        assert row.pert_total == 1583.33


# ════════════════════════════════════════════════════════════════
# Report Engine Tests
# ════════════════════════════════════════════════════════════════

class TestReportEngine:

    @patch("app.services.report_engine.ReportRepository")
    def test_generate_cost_by_wbs(self, MockRepo, sample_request, sample_cost_rows):
        mock_repo = MockRepo.return_value
        mock_repo.cost_by_wbs.return_value = sample_cost_rows
        mock_repo.get_project_name.return_value = "Test Project"

        from app.services.report_engine import ReportEngine
        engine = ReportEngine.__new__(ReportEngine)
        engine.repo = mock_repo

        result = engine.generate(sample_request)
        assert result.report_type == "cost_by_wbs"
        assert result.row_count == 2
        assert result.project_name == "Test Project"
        assert result.totals is not None
        assert result.totals["assignment_count"] == 17

    @patch("app.services.report_engine.ReportRepository")
    def test_generate_empty_result(self, MockRepo):
        mock_repo = MockRepo.return_value
        mock_repo.cost_by_resource.return_value = []
        mock_repo.get_project_name.return_value = "Empty Project"

        from app.services.report_engine import ReportEngine
        engine = ReportEngine.__new__(ReportEngine)
        engine.repo = mock_repo

        req = ReportRequest(
            report_type=ReportType.COST_BY_RESOURCE,
            filters=ReportFilter(project_id=99),
        )
        result = engine.generate(req)
        assert result.row_count == 0
        assert result.rows == []

    @patch("app.services.report_engine.ReportRepository")
    def test_generate_audit_report(self, MockRepo):
        mock_repo = MockRepo.return_value
        mock_repo.audit_log_query.return_value = [
            {"timestamp": "2026-01-01", "user_id": 1, "action": "CREATE",
             "entity_type": "resource_assignment", "entity_id": 5, "details": ""},
        ]
        mock_repo.get_project_name.return_value = "Audit Project"

        from app.services.report_engine import ReportEngine
        engine = ReportEngine.__new__(ReportEngine)
        engine.repo = mock_repo

        req = ReportRequest(
            report_type=ReportType.CHANGE_HISTORY,
            filters=ReportFilter(project_id=1),
        )
        result = engine.generate(req)
        assert result.report_type == "change_history"
        assert result.row_count == 1

    def test_get_catalog(self):
        from app.services.report_engine import ReportEngine
        engine = ReportEngine.__new__(ReportEngine)
        catalog = engine.get_catalog()
        assert "cost_control" in catalog
        assert "boe" in catalog
        assert "risk" in catalog
        assert "audit" in catalog
        assert "utilization" in catalog

    def test_report_columns_defined_for_all_types(self):
        from app.services.report_engine import REPORT_COLUMNS
        for rt in ReportType:
            assert rt in REPORT_COLUMNS, f"Missing columns for {rt}"
            assert len(REPORT_COLUMNS[rt]) > 0


# ════════════════════════════════════════════════════════════════
# Exporter Tests
# ════════════════════════════════════════════════════════════════

class TestExporters:

    def test_csv_export(self, sample_result):
        from app.services.report_exporters import CSVExporter
        content, content_type, filename = CSVExporter.export(sample_result, "test")
        assert content_type == "text/csv"
        assert filename.endswith(".csv")
        text = content.decode("utf-8")
        assert "WBS Item" in text
        assert "PERT" in text
        assert "TOTALS" in text

    def test_excel_export(self, sample_result):
        from app.services.report_exporters import ExcelExporter
        content, content_type, filename = ExcelExporter.export(sample_result, "test")
        assert "spreadsheetml" in content_type
        assert filename.endswith(".xlsx")
        assert len(content) > 100

    def test_pdf_export(self, sample_result):
        from app.services.report_exporters import PDFExporter
        content, content_type, filename = PDFExporter.export(sample_result, "test")
        assert content_type == "application/pdf"
        assert filename.endswith(".pdf")
        assert content[:4] == b"%PDF"

    def test_word_export(self, sample_result):
        from app.services.report_exporters import WordExporter
        content, content_type, filename = WordExporter.export(sample_result, "test")
        assert "wordprocessingml" in content_type
        assert filename.endswith(".docx")
        assert len(content) > 100

    def test_exporter_factory(self, sample_result):
        from app.services.report_exporters import ReportExporter
        for fmt in [ExportFormat.CSV, ExportFormat.XLSX, ExportFormat.PDF, ExportFormat.DOCX]:
            content, ct, fn = ReportExporter.export(sample_result, fmt)
            assert len(content) > 0

    def test_csv_handles_empty_rows(self):
        result = ReportResult(
            report_type="test", title="Empty", generated_at=datetime.utcnow(),
            project_name="P", filters_applied={},
            columns=[{"key": "a", "label": "A"}], rows=[], row_count=0,
        )
        from app.services.report_exporters import CSVExporter
        content, _, _ = CSVExporter.export(result, "test")
        assert b"A" in content


# ════════════════════════════════════════════════════════════════
# PERT Calculation Verification
# ════════════════════════════════════════════════════════════════

class TestPERTCalculations:

    def test_pert_formula(self):
        best, likely, worst = 10000, 15000, 25000
        pert = (best + 4 * likely + worst) / 6
        assert round(pert, 2) == 15833.33

    def test_std_deviation_formula(self):
        best, worst = 10000, 25000
        std_dev = (worst - best) / 6
        assert round(std_dev, 2) == 2500.0

    def test_confidence_interval_80(self):
        pert = 15833.33
        std_dev = 2500.0
        z = 1.28
        low = pert - z * std_dev
        high = pert + z * std_dev
        assert round(low, 2) == 12633.33
        assert round(high, 2) == 19033.33

    def test_combined_std_deviation(self):
        std_devs = [2500, 11666.67]
        combined = math.sqrt(sum(s ** 2 for s in std_devs))
        assert round(combined, 2) == 11931.52

    def test_risk_exposure(self):
        cost = 50000
        prob_weight = 0.60
        sev_weight = 0.50
        exposure = cost * prob_weight * sev_weight
        assert exposure == 15000.0


# ════════════════════════════════════════════════════════════════
# Report Job Model Tests
# ════════════════════════════════════════════════════════════════

class TestReportJobModel:

    def test_report_job_defaults(self):
        from app.models.database.report import ReportJob
        assert ReportJob.__tablename__ == "report_jobs"

    def test_report_job_response_schema(self):
        from app.models.schemas.report import ReportJobResponse
        job = MagicMock()
        job.id = 1
        job.report_type = "cost_by_wbs"
        job.status = "completed"
        job.output_format = "pdf"
        job.row_count = 25
        job.file_path = "reports/test.pdf"
        job.error_message = None
        job.created_at = datetime(2026, 4, 26)
        job.completed_at = datetime(2026, 4, 26)
        resp = ReportJobResponse.from_orm(job)
        assert resp.status == "completed"
        assert resp.row_count == 25
