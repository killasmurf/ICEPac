"""
Tests for the project service.
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.project_service import ProjectService


class TestProjectService:
    """Tests for ProjectService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def project_service(self, mock_db):
        """Create a ProjectService instance with mocked DB."""
        with patch('app.services.project_service.Project') as mock_project:
            service = ProjectService(mock_db)
            service.model = mock_project
            return service

    def test_get_returns_project(self, project_service, mock_db):
        """Test that get returns a project when found."""
        mock_project = MagicMock()
        mock_project.id = 1
        mock_project.is_archived = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_project

        result = project_service.get(1)

        assert result == mock_project

    def test_get_returns_none_when_not_found(self, project_service, mock_db):
        """Test that get returns None when project not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = project_service.get(999)

        assert result is None

    def test_get_or_404_raises_when_not_found(self, project_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            project_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_get_multi_with_pagination(self, project_service, mock_db):
        """Test getting multiple projects with pagination."""
        mock_projects = [MagicMock() for _ in range(3)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_projects

        result = project_service.get_multi(skip=0, limit=10)

        assert len(result) == 3

    def test_count(self, project_service, mock_db):
        """Test counting projects."""
        mock_db.query.return_value.filter.return_value.count.return_value = 5

        result = project_service.count()

        assert result == 5

    def test_search(self, project_service, mock_db):
        """Test searching projects."""
        mock_projects = [MagicMock()]
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_projects

        result = project_service.search("test", skip=0, limit=10)

        assert len(result) == 1

    def test_create(self, project_service, mock_db):
        """Test creating a project."""
        mock_project_in = MagicMock()
        mock_project_in.model_dump.return_value = {"name": "Test Project"}

        result = project_service.create(mock_project_in)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_delete_archives_project(self, project_service, mock_db):
        """Test that delete archives the project."""
        mock_project = MagicMock()
        mock_project.is_archived = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_project

        project_service.delete(1)

        assert mock_project.is_archived is True
        mock_db.commit.assert_called_once()
