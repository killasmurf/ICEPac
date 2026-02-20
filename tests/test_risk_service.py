"""
Tests for the risk service.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.database.risk import Risk
from app.models.database.wbs import WBS
from app.services.risk_service import RiskService


class TestRiskService:
    """Tests for RiskService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def risk_service(self, mock_db):
        """Create a RiskService instance with mocked DB."""
        return RiskService(mock_db)

    @pytest.fixture
    def mock_wbs(self):
        """Create a mock WBS item."""
        wbs = MagicMock(spec=WBS)
        wbs.id = 1
        wbs.approval_status = "draft"
        return wbs

    @pytest.fixture
    def mock_risk(self):
        """Create a mock risk."""
        risk = MagicMock(spec=Risk)
        risk.id = 1
        risk.wbs_id = 1
        risk.risk_category_code = "TECH"
        risk.risk_cost = 10000.0
        risk.probability_code = "M"
        risk.severity_code = "H"
        return risk

    @pytest.fixture
    def mock_probability_level(self):
        """Create a mock probability level."""
        level = MagicMock()
        level.code = "M"
        level.weight = 0.5
        return level

    @pytest.fixture
    def mock_severity_level(self):
        """Create a mock severity level."""
        level = MagicMock()
        level.code = "H"
        level.weight = 1.5
        return level

    def test_get_by_wbs_returns_risks(self, risk_service, mock_db, mock_risk):
        """Test getting risks by WBS ID."""
        with patch.object(
            risk_service.repository, "get_by_wbs", return_value=[mock_risk]
        ):
            result = risk_service.get_by_wbs(1)

        assert len(result) == 1
        assert result[0].risk_category_code == "TECH"

    def test_get_or_404_raises_when_not_found(self, risk_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        with patch.object(risk_service.repository, "get", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                risk_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_create_validates_wbs_exists(self, risk_service, mock_db):
        """Test that create validates WBS exists."""
        mock_data = MagicMock()
        mock_data.risk_category_code = "TECH"

        with patch.object(risk_service.wbs_repo, "get", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                risk_service.create(1, mock_data)

        assert exc_info.value.status_code == 404

    def test_create_prevents_when_submitted(self, risk_service, mock_db, mock_wbs):
        """Test that create prevents changes when WBS is submitted."""
        mock_wbs.approval_status = "submitted"
        mock_data = MagicMock()
        mock_data.risk_category_code = "TECH"

        with patch.object(risk_service.wbs_repo, "get", return_value=mock_wbs):
            with pytest.raises(HTTPException) as exc_info:
                risk_service.create(1, mock_data)

        assert exc_info.value.status_code == 409

    def test_create_prevents_when_approved(self, risk_service, mock_db, mock_wbs):
        """Test that create prevents changes when WBS is approved."""
        mock_wbs.approval_status = "approved"
        mock_data = MagicMock()
        mock_data.risk_category_code = "TECH"

        with patch.object(risk_service.wbs_repo, "get", return_value=mock_wbs):
            with pytest.raises(HTTPException) as exc_info:
                risk_service.create(1, mock_data)

        assert exc_info.value.status_code == 409

    def test_compute_risk_exposure(
        self,
        risk_service,
        mock_db,
        mock_risk,
        mock_probability_level,
        mock_severity_level,
    ):
        """Test risk exposure: cost * prob_weight * sev_weight."""
        mock_db.scalars.return_value.first.side_effect = [
            mock_probability_level,
            mock_severity_level,
        ]

        result = risk_service.compute_risk_exposure(mock_risk)

        # 10000 * 0.5 * 1.5 = 7500
        expected = 10000.0 * 0.5 * 1.5
        assert result == expected

    def test_compute_risk_exposure_defaults_to_zero(
        self, risk_service, mock_db, mock_risk
    ):
        """Test risk exposure defaults to 0 when weights not found."""
        mock_risk.probability_code = None
        mock_risk.severity_code = None

        result = risk_service.compute_risk_exposure(mock_risk)

        assert result == 0.0

    def test_update_prevents_when_submitted(
        self, risk_service, mock_db, mock_wbs, mock_risk
    ):
        """Test that update prevents changes when WBS is submitted."""
        mock_wbs.approval_status = "submitted"
        mock_data = MagicMock()

        with patch.object(risk_service.repository, "get", return_value=mock_risk):
            with patch.object(risk_service.wbs_repo, "get", return_value=mock_wbs):
                with pytest.raises(HTTPException) as exc_info:
                    risk_service.update(1, mock_data)

        assert exc_info.value.status_code == 409

    def test_delete_prevents_when_approved(
        self, risk_service, mock_db, mock_wbs, mock_risk
    ):
        """Test that delete prevents changes when WBS is approved."""
        mock_wbs.approval_status = "approved"

        with patch.object(risk_service.repository, "get", return_value=mock_risk):
            with patch.object(risk_service.wbs_repo, "get", return_value=mock_wbs):
                with pytest.raises(HTTPException) as exc_info:
                    risk_service.delete(1)

        assert exc_info.value.status_code == 409

    def test_risk_exposure_formula(self):
        """Test risk exposure formula: cost * probability * severity."""
        cost = 10000.0
        prob_weight = 0.5
        sev_weight = 1.5

        expected_exposure = cost * prob_weight * sev_weight
        assert expected_exposure == 7500.0
