"""
Tests for the config service.
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.config_service import ConfigService


class TestConfigService:
    """Tests for ConfigService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return MagicMock(spec=Session)

    @pytest.fixture
    def mock_model(self):
        """Create a mock SQLAlchemy model."""
        model = MagicMock()
        model.__name__ = "TestModel"
        model.id = MagicMock()
        model.code = MagicMock()
        model.is_active = MagicMock()
        return model

    @pytest.fixture
    def config_service(self, mock_model, mock_db):
        """Create a ConfigService instance with mocked DB."""
        return ConfigService(mock_model, mock_db)

    def test_get_returns_item(self, config_service, mock_db, mock_model):
        """Test that get returns an item when found."""
        mock_item = MagicMock()
        mock_item.id = 1
        mock_db.get.return_value = mock_item

        result = config_service.get(1)

        assert result == mock_item
        mock_db.get.assert_called_once_with(mock_model, 1)

    def test_get_returns_none_when_not_found(self, config_service, mock_db):
        """Test that get returns None when item not found."""
        mock_db.get.return_value = None

        result = config_service.get(999)

        assert result is None

    def test_get_or_404_raises_when_not_found(self, config_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        mock_db.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            config_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    @patch('app.services.config_service.select')
    def test_get_by_code(self, mock_select, config_service, mock_db):
        """Test getting an item by code."""
        mock_item = MagicMock()
        mock_item.code = "TEST"
        mock_db.scalar.return_value = mock_item

        result = config_service.get_by_code("TEST")

        assert result == mock_item

    @patch('app.services.config_service.select')
    def test_get_all(self, mock_select, config_service, mock_db):
        """Test getting all items."""
        mock_items = [MagicMock() for _ in range(3)]
        mock_db.scalars.return_value.all.return_value = mock_items

        result = config_service.get_all()

        assert len(result) == 3

    @patch('app.services.config_service.select')
    def test_get_active(self, mock_select, config_service, mock_db):
        """Test getting only active items."""
        mock_items = [MagicMock() for _ in range(2)]
        mock_db.scalars.return_value.all.return_value = mock_items

        result = config_service.get_active()

        assert len(result) == 2

    @patch('app.services.config_service.select')
    @patch('app.services.config_service.func')
    def test_count(self, mock_func, mock_select, config_service, mock_db):
        """Test counting items."""
        mock_db.scalar.return_value = 5

        result = config_service.count()

        assert result == 5

    @patch('app.services.config_service.select')
    def test_create(self, mock_select, config_service, mock_db):
        """Test creating an item."""
        mock_db.scalar.return_value = None  # No existing item with same code

        result = config_service.create({"code": "NEW", "description": "New Item"})

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @patch('app.services.config_service.select')
    def test_create_duplicate_code_raises(self, mock_select, config_service, mock_db):
        """Test that creating with duplicate code raises error."""
        existing = MagicMock()
        mock_db.scalar.return_value = existing

        with pytest.raises(HTTPException) as exc_info:
            config_service.create({"code": "EXISTING", "description": "Existing Item"})

        assert exc_info.value.status_code == 409

    def test_delete(self, config_service, mock_db):
        """Test deleting an item."""
        mock_item = MagicMock()
        mock_db.get.return_value = mock_item

        result = config_service.delete(1)

        assert result is True
        mock_db.delete.assert_called_once_with(mock_item)
        mock_db.commit.assert_called_once()

    def test_deactivate(self, config_service, mock_db):
        """Test deactivating (soft-deleting) an item."""
        mock_item = MagicMock()
        mock_item.is_active = True
        mock_db.get.return_value = mock_item

        config_service.deactivate(1)

        assert mock_item.is_active is False
        mock_db.commit.assert_called_once()
