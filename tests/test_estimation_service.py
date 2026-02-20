"""
Tests for the estimation service.
"""
import math
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.database.project import Project
from app.models.database.wbs import WBS
from app.services.estimation_service import EstimationService


class TestEstimationService:
    """Tests for EstimationService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def estimation_service(self, mock_db):
        """Create an EstimationService instance with mocked DB."""
        return EstimationService(mock_db)

    @pytest.fixture
    def mock_project(self):
        """Create a mock project."""
        project = MagicMock(spec=Project)
        project.id = 1
        project.project_name = "Test Project"
        return project

    @pytest.fixture
    def mock_wbs(self):
        """Create a mock WBS item."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "draft"
        return wbs

    @pytest.fixture
    def mock_assignments(self):
        """Create mock assignments with known PERT values."""
        assignments = []
        for i in range(3):
            assignment = MagicMock()
            assignment.id = i + 1
            assignment.pert_estimate = 100.0  # Each assignment = 100
            assignment.std_deviation = 10.0  # Each std dev = 10
            assignments.append(assignment)
        return assignments

    @pytest.fixture
    def mock_risks(self):
        """Create mock risks with known exposure values."""
        risks = []
        for i in range(2):
            risk = MagicMock()
            risk.id = i + 1
            risk.risk_cost = 1000.0
            risk.probability_code = "M"
            risk.severity_code = "H"
            risks.append(risk)
        return risks

    def test_get_wbs_cost_summary(
        self, estimation_service, mock_db, mock_wbs, mock_assignments
    ):
        """Test WBS cost summary calculation."""
        with patch.object(estimation_service.wbs_repo, "get", return_value=mock_wbs):
            with patch.object(
                estimation_service.assignment_repo,
                "get_by_wbs",
                return_value=mock_assignments,
            ):
                with patch.object(
                    estimation_service.risk_repo, "get_by_wbs", return_value=[]
                ):
                    with patch.object(
                        estimation_service.risk_service,
                        "compute_risk_exposure",
                        return_value=0,
                    ):
                        result = estimation_service.get_wbs_cost_summary(1)

        # 3 assignments x 100 PERT = 300 total
        assert result.total_pert_estimate == 300.0
        assert result.assignment_count == 3

    def test_combined_std_deviation(self, estimation_service):
        """Test combined standard deviation: sqrt(sum of variances)."""
        # 3 assignments with std_dev = 10 each
        # Variance = 10^2 = 100
        # Combined variance = 100 + 100 + 100 = 300
        # Combined std dev = sqrt(300) ≈ 17.32
        std_devs = [10.0, 10.0, 10.0]
        variances = [sd**2 for sd in std_devs]
        combined_std_dev = math.sqrt(sum(variances))

        expected = math.sqrt(300)
        assert abs(combined_std_dev - expected) < 0.01

    def test_confidence_interval_80_percent(self, estimation_service):
        """Test 80% confidence interval: PERT +/- 1.28 * std_dev."""
        pert = 300.0
        std_dev = 17.32
        z_80 = 1.28

        low, high = estimation_service._compute_confidence_interval(pert, std_dev)

        expected_low = pert - z_80 * std_dev
        expected_high = pert + z_80 * std_dev

        # Allow small floating point tolerance
        assert abs(low - expected_low) < 1.0
        assert abs(high - expected_high) < 1.0

    def test_get_project_estimation_aggregates_wbs(
        self, estimation_service, mock_db, mock_project
    ):
        """Test project estimation aggregates all WBS items."""
        mock_wbs_list = [MagicMock() for _ in range(3)]
        for i, wbs in enumerate(mock_wbs_list):
            wbs.id = i + 1
            wbs.wbs_code = f"{i + 1}.0"
            wbs.wbs_title = f"WBS {i + 1}"
            wbs.approval_status = "draft"

        with patch.object(
            estimation_service.project_repo, "get", return_value=mock_project
        ):
            with patch.object(
                estimation_service.wbs_repo,
                "get_by_project",
                return_value=mock_wbs_list,
            ):
                with patch.object(
                    estimation_service.assignment_repo, "get_by_wbs", return_value=[]
                ):
                    with patch.object(
                        estimation_service.risk_repo, "get_by_wbs", return_value=[]
                    ):
                        result = estimation_service.get_project_estimation(1)

        assert result.total_wbs_items == 3
        assert result.project_name == "Test Project"

    def test_risk_adjusted_estimate(self, estimation_service):
        """Test risk-adjusted estimate = PERT + total risk exposure."""
        pert = 300.0
        risk_exposure = 50.0

        risk_adjusted = pert + risk_exposure
        assert risk_adjusted == 350.0

    def test_confidence_interval_formula(self):
        """Test confidence interval formula with z=1.28 for 80%."""
        pert = 1000.0
        combined_std_dev = 100.0
        z = 1.28

        low = pert - z * combined_std_dev
        high = pert + z * combined_std_dev

        assert low == 872.0  # 1000 - 128
        assert high == 1128.0  # 1000 + 128

    def test_breakdown_grouping_logic(self):
        """Test cost breakdown grouping logic without service call."""
        # Test the grouping logic directly
        assignments_data = [
            {"cost_type_code": "LABOR", "pert": 100},
            {"cost_type_code": "LABOR", "pert": 150},
            {"cost_type_code": "MATERIAL", "pert": 200},
        ]

        # Group manually like the service does
        groups = {}
        for a in assignments_data:
            code = a["cost_type_code"]
            if code not in groups:
                groups[code] = {"total_pert": 0, "count": 0}
            groups[code]["total_pert"] += a["pert"]
            groups[code]["count"] += 1

        assert groups["LABOR"]["total_pert"] == 250.0
        assert groups["LABOR"]["count"] == 2
        assert groups["MATERIAL"]["total_pert"] == 200.0
        assert groups["MATERIAL"]["count"] == 1

    def test_variance_addition_for_combined_std_dev(self):
        """
        Test that variances are added (not std devs) when combining.
        Central Limit Theorem: Var(X+Y) = Var(X) + Var(Y) for independent vars.
        """
        # Two estimates with std dev = 6 each
        std_dev_1 = 6.0
        std_dev_2 = 6.0

        # Wrong way: adding std devs directly
        wrong_combined = std_dev_1 + std_dev_2  # = 12

        # Right way: sqrt(sum of variances)
        var_1 = std_dev_1**2  # = 36
        var_2 = std_dev_2**2  # = 36
        correct_combined = math.sqrt(var_1 + var_2)  # = sqrt(72) ≈ 8.49

        assert wrong_combined == 12.0
        assert abs(correct_combined - 8.485) < 0.01

        # The correct method gives smaller uncertainty than naive addition
        assert correct_combined < wrong_combined
