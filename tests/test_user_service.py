"""
Tests for the user service.
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.services.user_service import UserService


class TestUserService:
    """Tests for UserService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def user_service(self, mock_db):
        """Create a UserService instance with mocked DB."""
        with patch('app.services.user_service.User') as mock_user:
            service = UserService(mock_db)
            service.model = mock_user
            return service

    def test_get_returns_user(self, user_service, mock_db):
        """Test that get returns a user when found."""
        mock_user = MagicMock()
        mock_user.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        result = user_service.get(1)

        assert result == mock_user

    def test_get_returns_none_when_not_found(self, user_service, mock_db):
        """Test that get returns None when user not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = user_service.get(999)

        assert result is None

    def test_get_by_email(self, user_service, mock_db):
        """Test getting a user by email."""
        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        result = user_service.get_by_email("test@example.com")

        assert result == mock_user

    def test_get_multi_with_pagination(self, user_service, mock_db):
        """Test getting multiple users with pagination."""
        mock_users = [MagicMock() for _ in range(3)]
        mock_db.query.return_value.offset.return_value.limit.return_value.all.return_value = mock_users

        result = user_service.get_multi(skip=0, limit=10)

        assert len(result) == 3
        mock_db.query.return_value.offset.assert_called_with(0)

    def test_count(self, user_service, mock_db):
        """Test counting users."""
        mock_db.query.return_value.count.return_value = 5

        result = user_service.count()

        assert result == 5

    def test_search(self, user_service, mock_db):
        """Test searching users."""
        mock_users = [MagicMock()]
        mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = mock_users

        result = user_service.search("test", skip=0, limit=10)

        assert len(result) == 1
