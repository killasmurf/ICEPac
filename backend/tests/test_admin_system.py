"""Phase 2 Admin System - Comprehensive Unit Tests

Tests cover: repositories, services, routes, schemas, and audit logging.
Run with: pytest tests/test_admin_system.py -v
"""
import json
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch, PropertyMock
from sqlalchemy.orm import Session

# ════════════════════════════════════════════════════════════════
# Test Fixtures
# ════════════════════════════════════════════════════════════════

@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = MagicMock(spec=Session)
    db.query.return_value = db.query
    db.query.filter.return_value = db.query
    db.query.filter_by.return_value = db.query
    db.query.order_by.return_value = db.query
    db.query.offset.return_value = db.query
    db.query.limit.return_value = db.query
    db.query.first.return_value = None
    db.query.all.return_value = []
    db.query.scalar.return_value = 0
    return db


@pytest.fixture
def mock_resource():
    """Create a mock Resource object."""
    resource = MagicMock()
    resource.id = 1
    resource.resource_code = "RES001"
    resource.description = "Test Resource"
    resource.eoc = "Labor"
    resource.cost = 150.0
    resource.units = "hours"
    resource.supplier_id = 1
    resource.supplier_name = "Test Supplier"
    resource.notes = "Test notes"
    resource.is_active = True
    resource.created_at = datetime(2026, 1, 1)
    resource.updated_at = datetime(2026, 1, 1)
    resource.created_by = 1
    resource.updated_by = 1
    return resource


@pytest.fixture
def mock_supplier():
    """Create a mock Supplier object."""
    supplier = MagicMock()
    supplier.id = 1
    supplier.name = "Acme Corp"
    supplier.contact_name = "John Doe"
    supplier.email = "john@acme.com"
    supplier.phone = "555-0100"
    supplier.address = "123 Main St"
    supplier.website = "https://acme.com"
    supplier.notes = "Preferred supplier"
    supplier.is_active = True
    supplier.created_at = datetime(2026, 1, 1)
    supplier.updated_at = datetime(2026, 1, 1)
    supplier.created_by = 1
    supplier.updated_by = 1
    return supplier


@pytest.fixture
def mock_audit_log():
    """Create a mock AuditLog object."""
    log = MagicMock()
    log.id = 1
    log.user_id = 1
    log.username = "admin"
    log.action = "create"
    log.entity_type = "resource"
    log.entity_id = 1
    log.details = "Created resource RES001"
    log.old_values = None
    log.new_values = json.dumps({"resource_code": "RES001"})
    log.ip_address = "127.0.0.1"
    log.created_at = datetime(2026, 1, 1)
    return log


@pytest.fixture
def mock_current_user():
    """Create a mock authenticated user."""
    user = MagicMock()
    user.id = 1
    user.username = "admin"
    user.role = "admin"
    return user


# ════════════════════════════════════════════════════════════════
# Schema Validation Tests
# ════════════════════════════════════════════════════════════════

class TestResourceSchemas:
    """Test Resource Pydantic schemas."""

    def test_resource_create_valid(self):
        from app.models.schemas.resource import ResourceCreate
        data = ResourceCreate(
            resource_code="RES001",
            description="Test resource",
            eoc="Labor",
            cost=100.0,
            units="hours",
        )
        assert data.resource_code == "RES001"
        assert data.cost == 100.0

    def test_resource_create_code_uppercased(self):
        from app.models.schemas.resource import ResourceCreate
        data = ResourceCreate(
            resource_code="res001",
            description="Test resource",
            cost=50.0,
        )
        assert data.resource_code == "RES001"

    def test_resource_create_empty_code_fails(self):
        from app.models.schemas.resource import ResourceCreate
        with pytest.raises(Exception):
            ResourceCreate(resource_code="", description="Test", cost=0)

    def test_resource_create_negative_cost_fails(self):
        from app.models.schemas.resource import ResourceCreate
        with pytest.raises(Exception):
            ResourceCreate(
                resource_code="RES001",
                description="Test",
                cost=-10.0,
            )

    def test_resource_update_partial(self):
        from app.models.schemas.resource import ResourceUpdate
        data = ResourceUpdate(cost=200.0)
        result = data.dict(exclude_unset=True)
        assert result == {"cost": 200.0}
        assert "description" not in result


class TestSupplierSchemas:
    """Test Supplier Pydantic schemas."""

    def test_supplier_create_valid(self):
        from app.models.schemas.resource import SupplierCreate
        data = SupplierCreate(
            name="Acme Corp",
            contact_name="John",
            email="john@acme.com",
        )
        assert data.name == "Acme Corp"

    def test_supplier_create_invalid_email(self):
        from app.models.schemas.resource import SupplierCreate
        with pytest.raises(Exception):
            SupplierCreate(name="Bad Corp", email="not-an-email")

    def test_supplier_create_empty_name_fails(self):
        from app.models.schemas.resource import SupplierCreate
        with pytest.raises(Exception):
            SupplierCreate(name="")

    def test_supplier_update_partial(self):
        from app.models.schemas.resource import SupplierUpdate
        data = SupplierUpdate(phone="555-9999")
        result = data.dict(exclude_unset=True)
        assert result == {"phone": "555-9999"}


class TestConfigSchemas:
    """Test Config table Pydantic schemas."""

    def test_config_item_create(self):
        from app.models.schemas.config import ConfigItemCreate
        data = ConfigItemCreate(name="Test Item", code="TST", sort_order=1)
        assert data.name == "Test Item"

    def test_config_item_empty_name_fails(self):
        from app.models.schemas.config import ConfigItemCreate
        with pytest.raises(Exception):
            ConfigItemCreate(name="")

    def test_weighted_config_create(self):
        from app.models.schemas.config import WeightedConfigItemCreate
        data = WeightedConfigItemCreate(
            name="High", weight=0.75, level=4, sort_order=4
        )
        assert data.weight == 0.75
        assert data.level == 4

    def test_weighted_config_weight_bounds(self):
        from app.models.schemas.config import WeightedConfigItemCreate
        with pytest.raises(Exception):
            WeightedConfigItemCreate(name="Over", weight=1.5)

    def test_config_table_info_completeness(self):
        from app.models.schemas.config import CONFIG_TABLE_INFO
        assert len(CONFIG_TABLE_INFO) == 10
        for name, info in CONFIG_TABLE_INFO.items():
            assert "label" in info
            assert "description" in info
            assert "weighted" in info


class TestAuditLogSchemas:
    """Test AuditLog Pydantic schemas."""

    def test_audit_log_response(self, mock_audit_log):
        from app.models.schemas.audit_log import AuditLogResponse
        response = AuditLogResponse.from_orm(mock_audit_log)
        assert response.action == "create"
        assert response.entity_type == "resource"


# ════════════════════════════════════════════════════════════════
# Repository Tests
# ════════════════════════════════════════════════════════════════

class TestBaseRepository:
    """Test BaseRepository CRUD operations."""

    def test_get_by_id(self, mock_db, mock_resource):
        from app.repositories.base import BaseRepository
        from app.models.database.resource import Resource

        mock_db.query.return_value.filter.return_value.first.return_value = mock_resource
        repo = BaseRepository(Resource, mock_db)
        result = repo.get_by_id(1)
        assert result == mock_resource

    def test_get_by_id_not_found(self, mock_db):
        from app.repositories.base import BaseRepository
        from app.models.database.resource import Resource

        mock_db.query.return_value.filter.return_value.first.return_value = None
        repo = BaseRepository(Resource, mock_db)
        result = repo.get_by_id(999)
        assert result is None

    def test_create(self, mock_db):
        from app.repositories.base import BaseRepository
        from app.models.database.resource import Resource

        repo = BaseRepository(Resource, mock_db)
        repo.create({"resource_code": "NEW001", "description": "New", "cost": 10})
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_delete(self, mock_db, mock_resource):
        from app.repositories.base import BaseRepository
        from app.models.database.resource import Resource

        mock_db.query.return_value.filter.return_value.first.return_value = mock_resource
        repo = BaseRepository(Resource, mock_db)
        result = repo.delete(1)
        assert result is True
        mock_db.delete.assert_called_once_with(mock_resource)

    def test_delete_not_found(self, mock_db):
        from app.repositories.base import BaseRepository
        from app.models.database.resource import Resource

        mock_db.query.return_value.filter.return_value.first.return_value = None
        repo = BaseRepository(Resource, mock_db)
        result = repo.delete(999)
        assert result is False

    def test_exists(self, mock_db, mock_resource):
        from app.repositories.base import BaseRepository
        from app.models.database.resource import Resource

        mock_db.query.return_value.filter.return_value.first.return_value = mock_resource
        repo = BaseRepository(Resource, mock_db)
        assert repo.exists(resource_code="RES001") is True


class TestResourceRepository:
    """Test ResourceRepository specific methods."""

    def test_search(self, mock_db, mock_resource):
        from app.repositories.resource_repository import ResourceRepository

        mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = [mock_resource]
        repo = ResourceRepository(mock_db)
        results = repo.search("RES")
        assert len(results) == 1

    def test_get_by_code(self, mock_db, mock_resource):
        from app.repositories.resource_repository import ResourceRepository

        mock_db.query.return_value.filter.return_value.first.return_value = mock_resource
        repo = ResourceRepository(mock_db)
        result = repo.get_by_code("RES001")
        assert result.resource_code == "RES001"


class TestAuditRepository:
    """Test AuditRepository logging."""

    def test_log_action(self, mock_db):
        from app.repositories.audit_repository import AuditRepository

        repo = AuditRepository(mock_db)
        repo.log_action(
            user_id=1,
            username="admin",
            action="create",
            entity_type="resource",
            entity_id=1,
            details="Created resource",
        )
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()


# ════════════════════════════════════════════════════════════════
# Service Tests
# ════════════════════════════════════════════════════════════════

class TestResourceService:
    """Test ResourceService business logic."""

    @patch("app.services.resource_service.ResourceRepository")
    def test_get_resource_found(self, MockRepo, mock_db, mock_resource):
        from app.services.resource_service import ResourceService

        MockRepo.return_value.get_by_id.return_value = mock_resource
        svc = ResourceService(mock_db)
        result = svc.get_resource(1)
        assert result.resource_code == "RES001"

    @patch("app.services.resource_service.ResourceRepository")
    def test_get_resource_not_found(self, MockRepo, mock_db):
        from app.services.resource_service import ResourceService
        from fastapi import HTTPException

        MockRepo.return_value.get_by_id.return_value = None
        svc = ResourceService(mock_db)
        with pytest.raises(HTTPException) as exc:
            svc.get_resource(999)
        assert exc.value.status_code == 404

    @patch("app.services.resource_service.ResourceRepository")
    def test_create_resource_duplicate_code(self, MockRepo, mock_db, mock_resource):
        from app.services.resource_service import ResourceService
        from app.models.schemas.resource import ResourceCreate
        from fastapi import HTTPException

        MockRepo.return_value.get_by_code.return_value = mock_resource
        svc = ResourceService(mock_db)
        data = ResourceCreate(resource_code="RES001", description="Dup", cost=10)
        with pytest.raises(HTTPException) as exc:
            svc.create_resource(data, user_id=1)
        assert exc.value.status_code == 409

    @patch("app.services.resource_service.ResourceRepository")
    def test_create_resource_success(self, MockRepo, mock_db, mock_resource):
        from app.services.resource_service import ResourceService
        from app.models.schemas.resource import ResourceCreate

        MockRepo.return_value.get_by_code.return_value = None
        MockRepo.return_value.create.return_value = mock_resource
        svc = ResourceService(mock_db)
        data = ResourceCreate(resource_code="NEW001", description="New", cost=10)
        result = svc.create_resource(data, user_id=1)
        assert result.resource_code == "RES001"

    @patch("app.services.resource_service.ResourceRepository")
    def test_delete_resource_not_found(self, MockRepo, mock_db):
        from app.services.resource_service import ResourceService
        from fastapi import HTTPException

        MockRepo.return_value.get_by_id.return_value = None
        svc = ResourceService(mock_db)
        with pytest.raises(HTTPException) as exc:
            svc.delete_resource(999)
        assert exc.value.status_code == 404


class TestSupplierService:
    """Test SupplierService business logic."""

    @patch("app.services.supplier_service.SupplierRepository")
    def test_get_supplier_found(self, MockRepo, mock_db, mock_supplier):
        from app.services.supplier_service import SupplierService

        MockRepo.return_value.get_by_id.return_value = mock_supplier
        svc = SupplierService(mock_db)
        result = svc.get_supplier(1)
        assert result.name == "Acme Corp"

    @patch("app.services.supplier_service.SupplierRepository")
    def test_create_supplier_duplicate(self, MockRepo, mock_db, mock_supplier):
        from app.services.supplier_service import SupplierService
        from app.models.schemas.resource import SupplierCreate
        from fastapi import HTTPException

        MockRepo.return_value.get_by_name.return_value = mock_supplier
        svc = SupplierService(mock_db)
        data = SupplierCreate(name="Acme Corp")
        with pytest.raises(HTTPException) as exc:
            svc.create_supplier(data, user_id=1)
        assert exc.value.status_code == 409


class TestConfigService:
    """Test ConfigService dynamic table management."""

    def test_get_config_service_invalid_table(self, mock_db):
        from app.services.config_service import get_config_service
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            get_config_service("nonexistent_table", mock_db)
        assert exc.value.status_code == 404

    def test_get_config_service_valid_table(self, mock_db):
        from app.services.config_service import get_config_service

        svc = get_config_service("cost_types", mock_db)
        assert svc.table_name == "cost_types"

    def test_is_weighted_table(self):
        from app.services.config_service import is_weighted_table

        assert is_weighted_table("probability_levels") is True
        assert is_weighted_table("severity_levels") is True
        assert is_weighted_table("cost_types") is False

    def test_list_tables(self):
        from app.services.config_service import ConfigService

        tables = ConfigService.list_tables()
        assert len(tables) == 10
        names = [t["name"] for t in tables]
        assert "cost_types" in names
        assert "probability_levels" in names


class TestAuditService:
    """Test AuditService logging and retrieval."""

    def test_serialize_for_audit_dict(self):
        from app.services.audit_service import serialize_for_audit

        result = serialize_for_audit({"key": "value", "num": 42})
        assert result == {"key": "value", "num": "42"}

    def test_serialize_for_audit_none(self):
        from app.services.audit_service import serialize_for_audit

        assert serialize_for_audit(None) is None

    @patch("app.services.audit_service.AuditRepository")
    def test_log_action(self, MockRepo, mock_db):
        from app.services.audit_service import AuditService

        svc = AuditService(mock_db)
        svc.log(
            user_id=1,
            username="admin",
            action="create",
            entity_type="resource",
            entity_id=1,
        )
        MockRepo.return_value.log_action.assert_called_once()

    @patch("app.services.audit_service.AuditRepository")
    def test_get_log_not_found(self, MockRepo, mock_db):
        from app.services.audit_service import AuditService
        from fastapi import HTTPException

        MockRepo.return_value.get_by_id.return_value = None
        svc = AuditService(mock_db)
        with pytest.raises(HTTPException) as exc:
            svc.get_log(999)
        assert exc.value.status_code == 404


# ════════════════════════════════════════════════════════════════
# Database Model Tests
# ════════════════════════════════════════════════════════════════

class TestDatabaseModels:
    """Test SQLAlchemy model definitions."""

    def test_resource_model_tablename(self):
        from app.models.database.resource import Resource
        assert Resource.__tablename__ == "resources"

    def test_supplier_model_tablename(self):
        from app.models.database.resource import Supplier
        assert Supplier.__tablename__ == "suppliers"

    def test_audit_log_model_tablename(self):
        from app.models.database.audit_log import AuditLog
        assert AuditLog.__tablename__ == "audit_logs"

    def test_config_models_registry(self):
        from app.models.database.config_tables import ALL_CONFIG_MODELS
        assert len(ALL_CONFIG_MODELS) == 10
        assert "cost_types" in ALL_CONFIG_MODELS
        assert "probability_levels" in ALL_CONFIG_MODELS

    def test_weighted_tables_set(self):
        from app.models.database.config_tables import WEIGHTED_TABLES
        assert "probability_levels" in WEIGHTED_TABLES
        assert "severity_levels" in WEIGHTED_TABLES
        assert "pmb_weights" in WEIGHTED_TABLES
        assert "cost_types" not in WEIGHTED_TABLES
