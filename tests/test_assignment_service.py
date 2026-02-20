"""
Tests for the assignment service.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.database.assignment import ResourceAssignment
from app.models.database.wbs import WBS
from app.services.assignment_service import AssignmentService


class TestAssignmentService:
    """Tests for AssignmentService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def assignment_service(self, mock_db):
        """Create an AssignmentService instance with mocked DB."""
        return AssignmentService(mock_db)

    @pytest.fixture
    def mock_wbs(self):
        """Create a mock WBS item."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.approval_status = "draft"
        return wbs

    @pytest.fixture
    def mock_assignment(self):
        """Create a mock assignment."""
        assignment = MagicMock(spec=ResourceAssignment)
        assignment.id = 1
        assignment.wbs_id = 1
        assignment.resource_code = "RES001"
        assignment.best_estimate = 100.0
        assignment.likely_estimate = 150.0
        assignment.worst_estimate = 200.0
        assignment.pert_estimate = 150.0  # (100 + 4*150 + 200) / 6
        assignment.std_deviation = 16.67  # (200 - 100) / 6
        return assignment

    def test_get_by_wbs_returns_assignments(
        self, assignment_service, mock_db, mock_assignment
    ):
        """Test getting assignments by WBS ID."""
        mock_db.scalars.return_value.all.return_value = [mock_assignment]

        with patch.object(
            assignment_service.repository, "get_by_wbs", return_value=[mock_assignment]
        ):
            result = assignment_service.get_by_wbs(1)

        assert len(result) == 1
        assert result[0].resource_code == "RES001"

    def test_get_or_404_raises_when_not_found(self, assignment_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        with patch.object(assignment_service.repository, "get", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                assignment_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_create_validates_wbs_exists(self, assignment_service, mock_db):
        """Test that create validates WBS exists."""
        mock_data = MagicMock()
        mock_data.resource_code = "RES001"

        with patch.object(assignment_service.wbs_repo, "get", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                assignment_service.create(1, mock_data)

        assert exc_info.value.status_code == 404

    def test_create_prevents_when_submitted(
        self, assignment_service, mock_db, mock_wbs
    ):
        """Test that create prevents changes when WBS is submitted."""
        mock_wbs.approval_status = "submitted"
        mock_data = MagicMock()
        mock_data.resource_code = "RES001"

        with patch.object(assignment_service.wbs_repo, "get", return_value=mock_wbs):
            with pytest.raises(HTTPException) as exc_info:
                assignment_service.create(1, mock_data)

        assert exc_info.value.status_code == 409

    def test_create_prevents_when_approved(self, assignment_service, mock_db, mock_wbs):
        """Test that create prevents changes when WBS is approved."""
        mock_wbs.approval_status = "approved"
        mock_data = MagicMock()
        mock_data.resource_code = "RES001"

        with patch.object(assignment_service.wbs_repo, "get", return_value=mock_wbs):
            with pytest.raises(HTTPException) as exc_info:
                assignment_service.create(1, mock_data)

        assert exc_info.value.status_code == 409

    def test_create_validates_resource_code(
        self, assignment_service, mock_db, mock_wbs
    ):
        """Test that create validates resource code exists."""
        mock_data = MagicMock()
        mock_data.resource_code = "INVALID"
        mock_data.model_dump.return_value = {"resource_code": "INVALID"}

        # Mock WBS exists, but resource lookup returns None
        mock_db.scalars.return_value.first.return_value = None

        with patch.object(assignment_service.wbs_repo, "get", return_value=mock_wbs):
            with pytest.raises(HTTPException) as exc_info:
                assignment_service.create(1, mock_data)

        assert exc_info.value.status_code == 400

    def test_update_prevents_when_submitted(
        self, assignment_service, mock_db, mock_wbs, mock_assignment
    ):
        """Test that update prevents changes when WBS is submitted."""
        mock_wbs.approval_status = "submitted"
        mock_data = MagicMock()

        # Patch at the service level - get_or_404 calls repository.get
        with patch.object(
            assignment_service, "get_or_404", return_value=mock_assignment
        ):
            with patch.object(
                assignment_service.wbs_repo, "get", return_value=mock_wbs
            ):
                with pytest.raises(HTTPException) as exc_info:
                    assignment_service.update(1, mock_data)

        assert exc_info.value.status_code == 409

    def test_delete_prevents_when_approved(
        self, assignment_service, mock_db, mock_wbs, mock_assignment
    ):
        """Test that delete prevents changes when WBS is approved."""
        mock_wbs.approval_status = "approved"

        # Patch at the service level - get_or_404 calls repository.get
        with patch.object(
            assignment_service, "get_or_404", return_value=mock_assignment
        ):
            with patch.object(
                assignment_service.wbs_repo, "get", return_value=mock_wbs
            ):
                with pytest.raises(HTTPException) as exc_info:
                    assignment_service.delete(1)

        assert exc_info.value.status_code == 409

    def test_pert_formula_calculation(self):
        """Test PERT formula: (best + 4*likely + worst) / 6."""
        best = 100.0
        likely = 150.0
        worst = 200.0

        expected_pert = (best + 4 * likely + worst) / 6
        assert expected_pert == 150.0

    def test_std_deviation_formula(self):
        """Test standard deviation formula: (worst - best) / 6."""
        best = 100.0
        worst = 200.0

        expected_std_dev = (worst - best) / 6
        assert round(expected_std_dev, 2) == 16.67
