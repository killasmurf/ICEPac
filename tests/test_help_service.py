"""
Tests for the help service.
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.help_service import HelpService


class TestHelpService:
    """Tests for HelpService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def help_service(self, mock_db):
        """Create a HelpService instance with mocked DB."""
        with patch('app.services.help_service.HelpTopic') as mock_help:
            service = HelpService(mock_db)
            service.model = mock_help
            return service

    def test_get_returns_topic(self, help_service, mock_db):
        """Test that get returns a help topic when found."""
        mock_topic = MagicMock()
        mock_topic.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_topic

        result = help_service.get(1)

        assert result == mock_topic

    def test_get_returns_none_when_not_found(self, help_service, mock_db):
        """Test that get returns None when topic not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = help_service.get(999)

        assert result is None

    def test_get_or_404_raises_when_not_found(self, help_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            help_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_get_all(self, help_service, mock_db):
        """Test getting all help topics."""
        mock_topics = [MagicMock() for _ in range(3)]
        mock_db.query.return_value.order_by.return_value.all.return_value = mock_topics

        result = help_service.get_all()

        assert len(result) == 3

    def test_search(self, help_service, mock_db):
        """Test searching help topics."""
        mock_topics = [MagicMock()]
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_topics

        result = help_service.search("test")

        assert len(result) == 1

    def test_get_by_category(self, help_service, mock_db):
        """Test getting topics by category."""
        mock_topics = [MagicMock() for _ in range(2)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_topics

        result = help_service.get_by_category("Getting Started")

        assert len(result) == 2
