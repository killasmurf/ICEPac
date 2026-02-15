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
        """Create a HelpService instance with mocked repos."""
        with patch('app.services.help_service.HelpCategoryRepository') as mock_cat_repo, \
             patch('app.services.help_service.HelpTopicRepository') as mock_topic_repo:
            service = HelpService(mock_db)
            service._mock_cat_repo = mock_cat_repo.return_value
            service._mock_topic_repo = mock_topic_repo.return_value
            return service

    def test_get_topic_returns_topic(self, help_service):
        """Test that get_topic returns a help topic when found."""
        mock_topic = MagicMock()
        mock_topic.id = 1
        help_service.topic_repo.get_with_descriptions.return_value = mock_topic

        result = help_service.get_topic(1)

        assert result == mock_topic

    def test_get_topic_raises_404_when_not_found(self, help_service):
        """Test that get_topic raises HTTPException when not found."""
        help_service.topic_repo.get_with_descriptions.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            help_service.get_topic(999)

        assert exc_info.value.status_code == 404

    def test_get_topics(self, help_service):
        """Test getting all help topics."""
        mock_topics = [MagicMock() for _ in range(3)]
        help_service.topic_repo.get_active.return_value = mock_topics

        result = help_service.get_topics()

        assert len(result) == 3

    def test_get_categories(self, help_service):
        """Test getting all categories."""
        mock_cats = [MagicMock() for _ in range(2)]
        help_service.category_repo.get_active.return_value = mock_cats

        result = help_service.get_categories()

        assert len(result) == 2

    def test_search_topics(self, help_service):
        """Test searching help topics."""
        mock_topics = [MagicMock()]
        help_service.topic_repo.search.return_value = mock_topics

        result = help_service.search_topics("test")

        assert len(result) == 1

    def test_get_topics_by_category(self, help_service):
        """Test getting topics by category."""
        mock_category = MagicMock()
        help_service.category_repo.get.return_value = mock_category
        mock_topics = [MagicMock() for _ in range(2)]
        help_service.topic_repo.get_by_category.return_value = mock_topics

        result = help_service.get_topics_by_category(1)

        assert len(result) == 2

    def test_get_topics_by_category_raises_404_for_unknown_category(self, help_service):
        """Test that get_topics_by_category raises 404 for unknown category."""
        help_service.category_repo.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            help_service.get_topics_by_category(999)

        assert exc_info.value.status_code == 404
