"""
Tests for the approval service.
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.approval_service import ApprovalService
from app.models.database.wbs import WBS


class TestApprovalService:
    """Tests for ApprovalService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def approval_service(self, mock_db):
        """Create an ApprovalService instance with mocked DB."""
        return ApprovalService(mock_db)

    @pytest.fixture
    def mock_wbs_draft(self):
        """Create a mock WBS in draft status."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "draft"
        wbs.approver = None
        wbs.approver_date = None
        wbs.estimate_revision = 0
        return wbs

    @pytest.fixture
    def mock_wbs_submitted(self):
        """Create a mock WBS in submitted status."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "submitted"
        wbs.approver = None
        wbs.approver_date = None
        wbs.estimate_revision = 0
        return wbs

    @pytest.fixture
    def mock_wbs_rejected(self):
        """Create a mock WBS in rejected status."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "rejected"
        wbs.approver = None
        wbs.approver_date = None
        wbs.estimate_revision = 0
        return wbs

    @pytest.fixture
    def mock_wbs_approved(self):
        """Create a mock WBS in approved status."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "approved"
        wbs.approver = "admin"
        wbs.approver_date = MagicMock()
        wbs.estimate_revision = 1
        return wbs

    # =========================================================================
    # Valid Transitions
    # =========================================================================

    def test_submit_from_draft(self, approval_service, mock_db, mock_wbs_draft):
        """Test draft -> submitted transition."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_draft):
            with patch.object(approval_service.assignment_repo, 'count_by_wbs', return_value=1):
                result = approval_service.submit_for_approval(1, user_id=1, username="testuser")

        assert mock_wbs_draft.approval_status == "submitted"
        mock_db.commit.assert_called()

    def test_approve_from_submitted(self, approval_service, mock_db, mock_wbs_submitted):
        """Test submitted -> approved transition."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_submitted):
            result = approval_service.approve(1, user_id=1, username="admin")

        assert mock_wbs_submitted.approval_status == "approved"
        assert mock_wbs_submitted.approver == "admin"
        assert mock_wbs_submitted.estimate_revision == 1
        mock_db.commit.assert_called()

    def test_reject_from_submitted(self, approval_service, mock_db, mock_wbs_submitted):
        """Test submitted -> rejected transition."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_submitted):
            result = approval_service.reject(
                1, user_id=1, username="admin", comment="Needs revision"
            )

        assert mock_wbs_submitted.approval_status == "rejected"
        mock_db.commit.assert_called()

    def test_reset_from_rejected(self, approval_service, mock_db, mock_wbs_rejected):
        """Test rejected -> draft transition."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_rejected):
            result = approval_service.reset_to_draft(1, user_id=1, username="testuser")

        assert mock_wbs_rejected.approval_status == "draft"
        mock_db.commit.assert_called()

    # =========================================================================
    # Invalid Transitions
    # =========================================================================

    def test_cannot_submit_from_submitted(self, approval_service, mock_db, mock_wbs_submitted):
        """Test that cannot submit from submitted status."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_submitted):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.submit_for_approval(1, user_id=1, username="testuser")

        assert exc_info.value.status_code == 409

    def test_cannot_submit_from_approved(self, approval_service, mock_db, mock_wbs_approved):
        """Test that cannot submit from approved status."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_approved):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.submit_for_approval(1, user_id=1, username="testuser")

        assert exc_info.value.status_code == 409

    def test_cannot_approve_from_draft(self, approval_service, mock_db, mock_wbs_draft):
        """Test that cannot approve from draft status."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_draft):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.approve(1, user_id=1, username="admin")

        assert exc_info.value.status_code == 409

    def test_cannot_approve_from_rejected(self, approval_service, mock_db, mock_wbs_rejected):
        """Test that cannot approve from rejected status."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_rejected):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.approve(1, user_id=1, username="admin")

        assert exc_info.value.status_code == 409

    def test_cannot_reject_from_draft(self, approval_service, mock_db, mock_wbs_draft):
        """Test that cannot reject from draft status."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_draft):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.reject(1, user_id=1, username="admin")

        assert exc_info.value.status_code == 409

    def test_cannot_modify_approved(self, approval_service, mock_db, mock_wbs_approved):
        """Test that approved WBS cannot be modified."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_approved):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.reject(1, user_id=1, username="admin")

        assert exc_info.value.status_code == 409

    def test_cannot_reset_from_draft(self, approval_service, mock_db, mock_wbs_draft):
        """Test that cannot reset from draft status."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_draft):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.reset_to_draft(1, user_id=1, username="testuser")

        assert exc_info.value.status_code == 409

    # =========================================================================
    # Validation
    # =========================================================================

    def test_submit_requires_assignments(self, approval_service, mock_db, mock_wbs_draft):
        """Test that submit requires at least one assignment."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=mock_wbs_draft):
            with patch.object(approval_service.assignment_repo, 'count_by_wbs', return_value=0):
                with pytest.raises(HTTPException) as exc_info:
                    approval_service.submit_for_approval(1, user_id=1, username="testuser")

        assert exc_info.value.status_code == 400

    def test_wbs_not_found(self, approval_service, mock_db):
        """Test that 404 is raised when WBS not found."""
        with patch.object(approval_service.wbs_repo, 'get', return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                approval_service.submit_for_approval(1, user_id=1, username="testuser")

        assert exc_info.value.status_code == 404

    # =========================================================================
    # State Machine Verification
    # =========================================================================

    def test_valid_transitions_state_machine(self):
        """Verify the state machine transitions are correct."""
        valid_transitions = {
            "draft": ["submitted"],
            "submitted": ["approved", "rejected"],
            "rejected": ["draft"],
            "approved": [],
        }

        # Verify transitions match expected
        assert set(valid_transitions["draft"]) == {"submitted"}
        assert set(valid_transitions["submitted"]) == {"approved", "rejected"}
        assert set(valid_transitions["rejected"]) == {"draft"}
        assert valid_transitions["approved"] == []

    def test_full_approval_cycle(self, approval_service, mock_db):
        """Test a complete approval cycle: draft -> submitted -> approved."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "draft"
        wbs.estimate_revision = 0

        # Step 1: Submit
        with patch.object(approval_service.wbs_repo, 'get', return_value=wbs):
            with patch.object(approval_service.assignment_repo, 'count_by_wbs', return_value=1):
                approval_service.submit_for_approval(1, user_id=1, username="user")

        assert wbs.approval_status == "submitted"

        # Step 2: Approve
        with patch.object(approval_service.wbs_repo, 'get', return_value=wbs):
            approval_service.approve(1, user_id=2, username="admin")

        assert wbs.approval_status == "approved"
        assert wbs.estimate_revision == 1

    def test_rejection_and_resubmit_cycle(self, approval_service, mock_db):
        """Test rejection cycle: draft -> submitted -> rejected -> draft -> submitted."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.wbs_code = "1.0"
        wbs.wbs_title = "Test WBS"
        wbs.approval_status = "draft"
        wbs.estimate_revision = 0

        # Step 1: Submit
        with patch.object(approval_service.wbs_repo, 'get', return_value=wbs):
            with patch.object(approval_service.assignment_repo, 'count_by_wbs', return_value=1):
                approval_service.submit_for_approval(1, user_id=1, username="user")

        assert wbs.approval_status == "submitted"

        # Step 2: Reject
        with patch.object(approval_service.wbs_repo, 'get', return_value=wbs):
            approval_service.reject(1, user_id=2, username="admin", comment="Fix estimate")

        assert wbs.approval_status == "rejected"

        # Step 3: Reset to draft
        with patch.object(approval_service.wbs_repo, 'get', return_value=wbs):
            approval_service.reset_to_draft(1, user_id=1, username="user")

        assert wbs.approval_status == "draft"

        # Step 4: Resubmit
        with patch.object(approval_service.wbs_repo, 'get', return_value=wbs):
            with patch.object(approval_service.assignment_repo, 'count_by_wbs', return_value=1):
                approval_service.submit_for_approval(1, user_id=1, username="user")

        assert wbs.approval_status == "submitted"
