"""
Tests for the user service.
"""
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
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
        """Create a UserService instance with mocked repository."""
        service = UserService(mock_db)
        service.repository = MagicMock()
        return service

    def test_get_returns_user(self, user_service):
        """Test that get returns a user when found."""
        mock_user = MagicMock()
        mock_user.id = 1
        user_service.repository.get.return_value = mock_user

        result = user_service.get(1)

        assert result == mock_user

    def test_get_returns_none_when_not_found(self, user_service):
        """Test that get returns None when user not found."""
        user_service.repository.get.return_value = None

        result = user_service.get(999)

        assert result is None

    def test_get_by_username(self, user_service):
        """Test getting a user by username."""
        mock_user = MagicMock()
        mock_user.username = "testuser"
        user_service.repository.get_by_username.return_value = mock_user

        result = user_service.get_by_username("testuser")

        assert result == mock_user

    def test_get_multi_with_pagination(self, user_service):
        """Test getting multiple users with pagination."""
        mock_users = [MagicMock() for _ in range(3)]
        user_service.repository.get_multi.return_value = mock_users

        result = user_service.get_multi(skip=0, limit=10)

        assert len(result) == 3

    def test_count(self, user_service):
        """Test counting users."""
        user_service.repository.count.return_value = 5

        result = user_service.count()

        assert result == 5

    def test_get_or_404_raises_when_not_found(self, user_service):
        """Test that get_or_404 raises HTTPException when not found."""
        user_service.repository.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            user_service.get_or_404(999)

        assert exc_info.value.status_code == 404
