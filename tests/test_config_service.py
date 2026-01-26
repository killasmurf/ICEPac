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
        model.name = MagicMock()
        model.code = MagicMock()
        model.is_active = MagicMock()
        model.sort_order = MagicMock()
        return model

    @pytest.fixture
    def config_service(self, mock_model, mock_db):
        """Create a ConfigService instance with mocked DB."""
        return ConfigService(mock_model, mock_db)

    def test_get_returns_item(self, config_service, mock_db):
        """Test that get returns an item when found."""
        mock_item = MagicMock()
        mock_item.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_item

        result = config_service.get(1)

        assert result == mock_item

    def test_get_returns_none_when_not_found(self, config_service, mock_db):
        """Test that get returns None when item not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = config_service.get(999)

        assert result is None

    def test_get_or_404_raises_when_not_found(self, config_service, mock_db):
        """Test that get_or_404 raises HTTPException when not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            config_service.get_or_404(999)

        assert exc_info.value.status_code == 404

    def test_get_by_name(self, config_service, mock_db):
        """Test getting an item by name."""
        mock_item = MagicMock()
        mock_item.name = "Test Item"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_item

        result = config_service.get_by_name("Test Item")

        assert result == mock_item

    def test_get_all(self, config_service, mock_db):
        """Test getting all items."""
        mock_items = [MagicMock() for _ in range(3)]
        mock_db.query.return_value.order_by.return_value.all.return_value = mock_items

        result = config_service.get_all()

        assert len(result) == 3

    def test_get_all_active_only(self, config_service, mock_db):
        """Test getting only active items."""
        mock_items = [MagicMock() for _ in range(2)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_items

        result = config_service.get_all(active_only=True)

        assert len(result) == 2

    def test_count(self, config_service, mock_db):
        """Test counting items."""
        mock_db.query.return_value.count.return_value = 5

        result = config_service.count()

        assert result == 5

    def test_create(self, config_service, mock_db):
        """Test creating an item."""
        mock_db.query.return_value.filter.return_value.first.return_value = None  # No existing

        result = config_service.create({"name": "New Item"})

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_duplicate_name_raises(self, config_service, mock_db):
        """Test that creating with duplicate name raises error."""
        existing = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = existing

        with pytest.raises(HTTPException) as exc_info:
            config_service.create({"name": "Existing Item"})

        assert exc_info.value.status_code == 400

    def test_delete_soft(self, config_service, mock_db):
        """Test soft deleting an item."""
        mock_item = MagicMock()
        mock_item.is_active = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_item

        config_service.delete(1, soft=True)

        assert mock_item.is_active is False
        mock_db.commit.assert_called_once()
