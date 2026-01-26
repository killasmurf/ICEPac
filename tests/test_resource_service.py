"""
Tests for the resource service.
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.resource_service import ResourceService


class TestResourceService:
    """Tests for ResourceService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def resource_service(self, mock_db):
        """Create a ResourceService instance with mocked DB."""
        with patch('app.services.resource_service.Resource') as mock_resource:
            service = ResourceService(mock_db)
            service.model = mock_resource
            return service

    def test_get_returns_resource(self, resource_service, mock_db):
        """Test that get returns a resource when found."""
        mock_resource = MagicMock()
        mock_resource.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_resource

        result = resource_service.get(1)

        assert result == mock_resource

    def test_get_returns_none_when_not_found(self, resource_service, mock_db):
        """Test that get returns None when resource not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = resource_service.get(999)

        assert result is None

    def test_get_or_404_raises_when_not_found(self, resource_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            resource_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_get_multi_with_pagination(self, resource_service, mock_db):
        """Test getting multiple resources with pagination."""
        mock_resources = [MagicMock() for _ in range(3)]
        mock_db.query.return_value.offset.return_value.limit.return_value.all.return_value = mock_resources

        result = resource_service.get_multi(skip=0, limit=10)

        assert len(result) == 3

    def test_get_multi_active_only(self, resource_service, mock_db):
        """Test getting only active resources."""
        mock_resources = [MagicMock() for _ in range(2)]
        mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = mock_resources

        result = resource_service.get_multi(skip=0, limit=10, active_only=True)

        assert len(result) == 2

    def test_count(self, resource_service, mock_db):
        """Test counting resources."""
        mock_db.query.return_value.count.return_value = 5

        result = resource_service.count()

        assert result == 5

    def test_search(self, resource_service, mock_db):
        """Test searching resources."""
        mock_resources = [MagicMock()]
        mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = mock_resources

        result = resource_service.search("test", skip=0, limit=10)

        assert len(result) == 1

    def test_create(self, resource_service, mock_db):
        """Test creating a resource."""
        mock_resource_in = MagicMock()
        mock_resource_in.model_dump.return_value = {"name": "Test Resource"}

        result = resource_service.create(mock_resource_in)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_delete_soft(self, resource_service, mock_db):
        """Test soft deleting a resource."""
        mock_resource = MagicMock()
        mock_resource.is_active = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_resource

        resource_service.delete(1)

        assert mock_resource.is_active is False
        mock_db.commit.assert_called_once()
