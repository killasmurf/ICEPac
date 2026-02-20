"""
Tests for the resource service.
"""
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.resource_service import ResourceService


class TestResourceService:
    """Tests for ResourceService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def resource_service(self, mock_db):
        """Create a ResourceService instance with mocked repository."""
        service = ResourceService(mock_db)
        service.repository = MagicMock()
        return service

    def test_get_returns_resource(self, resource_service):
        """Test that get returns a resource when found."""
        mock_resource = MagicMock()
        mock_resource.id = 1
        resource_service.repository.get.return_value = mock_resource

        result = resource_service.get(1)

        assert result == mock_resource
        resource_service.repository.get.assert_called_once_with(1)

    def test_get_returns_none_when_not_found(self, resource_service):
        """Test that get returns None when resource not found."""
        resource_service.repository.get.return_value = None

        result = resource_service.get(999)

        assert result is None

    def test_get_or_404_raises_when_not_found(self, resource_service):
        """Test that get_or_404 raises HTTPException when not found."""
        resource_service.repository.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            resource_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_get_multi_with_pagination(self, resource_service):
        """Test getting multiple resources with pagination."""
        mock_resources = [MagicMock() for _ in range(3)]
        resource_service.repository.get_multi.return_value = mock_resources

        result = resource_service.get_multi(skip=0, limit=10)

        assert len(result) == 3

    def test_get_active(self, resource_service):
        """Test getting only active resources."""
        mock_resources = [MagicMock() for _ in range(2)]
        resource_service.repository.get_active.return_value = mock_resources

        result = resource_service.get_active(skip=0, limit=10)

        assert len(result) == 2

    def test_count(self, resource_service):
        """Test counting resources."""
        resource_service.repository.count.return_value = 5

        result = resource_service.count()

        assert result == 5

    def test_search(self, resource_service):
        """Test searching resources."""
        mock_resources = [MagicMock()]
        resource_service.repository.search.return_value = mock_resources

        result = resource_service.search("test", skip=0, limit=10)

        assert len(result) == 1

    def test_create(self, resource_service):
        """Test creating a resource."""
        mock_resource_in = MagicMock()
        mock_resource_in.resource_code = "RES-001"
        mock_resource_in.model_dump.return_value = {
            "resource_code": "RES-001",
        }
        resource_service.repository.get_by_code.return_value = None

        resource_service.create(mock_resource_in)

        resource_service.repository.create.assert_called_once()

    def test_create_duplicate_raises(self, resource_service):
        """Test that creating with duplicate code raises 409."""
        mock_resource_in = MagicMock()
        mock_resource_in.resource_code = "RES-001"
        resource_service.repository.get_by_code.return_value = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            resource_service.create(mock_resource_in)

        assert exc_info.value.status_code == 409

    def test_delete(self, resource_service):
        """Test deleting a resource."""
        resource_service.repository.get.return_value = MagicMock()
        resource_service.repository.delete.return_value = True

        result = resource_service.delete(1)

        assert result is True
