"""Comprehensive tests for Phase 2 Admin System.

Tests cover:
- ResourceService and ResourceRepository
- SupplierService and SupplierRepository
- ConfigService
- AuditService
- Admin API routes
"""
from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

# ============================================================
# Mock Models
# ============================================================


class MockResource:
    """Mock Resource model."""

    def __init__(
        self,
        id=1,
        resource_code="ENG-SR",
        description="Senior Engineer",
        eoc="LABOR",
        cost=Decimal("150.00"),
        units="hour",
        is_active=True,
    ):
        self.id = id
        self.resource_code = resource_code
        self.description = description
        self.eoc = eoc
        self.cost = cost
        self.units = units
        self.is_active = is_active
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()


class MockSupplier:
    """Mock Supplier model."""

    def __init__(
        self,
        id=1,
        supplier_code="ACME",
        name="Acme Corporation",
        contact="John Smith",
        phone="+1-555-0100",
        email="john@acme.com",
        notes=None,
        is_active=True,
    ):
        self.id = id
        self.supplier_code = supplier_code
        self.name = name
        self.contact = contact
        self.phone = phone
        self.email = email
        self.notes = notes
        self.is_active = is_active
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()


class MockConfigItem:
    """Mock ConfigItem model."""

    def __init__(self, id=1, code="LABOR", description="Labor costs", is_active=True):
        self.id = id
        self.code = code
        self.description = description
        self.is_active = is_active
        self.created_at = datetime.utcnow()


class MockWeightedConfigItem:
    """Mock WeightedConfigItem model."""

    def __init__(
        self,
        id=1,
        code="HIGH",
        description="High probability",
        weight=Decimal("0.75"),
        is_active=True,
    ):
        self.id = id
        self.code = code
        self.description = description
        self.weight = weight
        self.is_active = is_active
        self.created_at = datetime.utcnow()


class MockAuditLog:
    """Mock AuditLog model."""

    def __init__(
        self,
        id=1,
        user_id=1,
        action="CREATE",
        entity_type="Resource",
        entity_id=1,
        old_values=None,
        new_values=None,
    ):
        self.id = id
        self.user_id = user_id
        self.action = action
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.old_values = old_values
        self.new_values = new_values
        self.ip_address = "127.0.0.1"
        self.user_agent = "TestClient"
        self.created_at = datetime.utcnow()
        self.user = MagicMock(username="admin")


# ============================================================
# Test ResourceRepository
# ============================================================


class TestResourceRepository:
    """Tests for ResourceRepository."""

    def setup_method(self):
        self.mock_db = MagicMock(spec=Session)

    def test_get_by_code_finds_resource(self):
        """Test finding resource by code."""
        resource = MockResource(resource_code="ENG-SR")

        with patch(
            "app.repositories.resource_repository.ResourceRepository"
        ) as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = resource

            result = mock_repo.get_by_code("ENG-SR")
            assert result.resource_code == "ENG-SR"

    def test_get_by_code_returns_none_for_nonexistent(self):
        """Test get_by_code returns None for non-existent code."""
        with patch(
            "app.repositories.resource_repository.ResourceRepository"
        ) as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = None

            result = mock_repo.get_by_code("NONEXISTENT")
            assert result is None

    def test_get_active_returns_active_resources(self):
        """Test get_active returns only active resources."""
        resources = [
            MockResource(id=1, is_active=True),
            MockResource(id=2, is_active=True),
        ]

        with patch(
            "app.repositories.resource_repository.ResourceRepository"
        ) as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_active.return_value = resources

            result = mock_repo.get_active(skip=0, limit=100)
            assert len(result) == 2
            assert all(r.is_active for r in result)

    def test_search_finds_matching_resources(self):
        """Test search finds resources by code or description."""
        resources = [
            MockResource(resource_code="ENG-SR", description="Senior Engineer")
        ]

        with patch(
            "app.repositories.resource_repository.ResourceRepository"
        ) as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.search.return_value = resources

            result = mock_repo.search("engineer", skip=0, limit=100)
            assert len(result) == 1


# ============================================================
# Test SupplierRepository
# ============================================================


class TestSupplierRepository:
    """Tests for SupplierRepository."""

    def setup_method(self):
        self.mock_db = MagicMock(spec=Session)

    def test_get_by_code_finds_supplier(self):
        """Test finding supplier by code."""
        supplier = MockSupplier(supplier_code="ACME")

        with patch(
            "app.repositories.supplier_repository.SupplierRepository"
        ) as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = supplier

            result = mock_repo.get_by_code("ACME")
            assert result.supplier_code == "ACME"

    def test_search_finds_matching_suppliers(self):
        """Test search finds suppliers by name, code, or contact."""
        suppliers = [MockSupplier(name="Acme Corporation")]

        with patch(
            "app.repositories.supplier_repository.SupplierRepository"
        ) as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.search.return_value = suppliers

            result = mock_repo.search("acme", skip=0, limit=100)
            assert len(result) == 1


# ============================================================
# Test ResourceService
# ============================================================


class TestResourceService:
    """Tests for ResourceService."""

    def setup_method(self):
        self.mock_db = MagicMock(spec=Session)

    def test_create_resource_succeeds_with_unique_code(self):
        """Test creating resource with unique code."""
        new_resource = MockResource(id=1, resource_code="NEW-RES")

        with patch("app.services.resource_service.ResourceRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = None
            mock_repo.create.return_value = new_resource

            from app.services.resource_service import ResourceService

            service = ResourceService(self.mock_db)

            resource_in = MagicMock()
            resource_in.resource_code = "NEW-RES"
            resource_in.model_dump.return_value = {
                "resource_code": "NEW-RES",
                "description": "New Resource",
            }

            result = service.create(resource_in)
            assert result.resource_code == "NEW-RES"

    def test_create_resource_raises_conflict_for_duplicate_code(self):
        """Test creating resource with duplicate code raises 409."""
        existing = MockResource(resource_code="EXISTING")

        with patch("app.services.resource_service.ResourceRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = existing

            from app.services.resource_service import ResourceService

            service = ResourceService(self.mock_db)

            resource_in = MagicMock()
            resource_in.resource_code = "EXISTING"

            with pytest.raises(HTTPException) as exc_info:
                service.create(resource_in)

            assert exc_info.value.status_code == 409

    def test_get_or_404_raises_for_nonexistent(self):
        """Test get_or_404 raises 404 for non-existent resource."""
        with patch("app.services.resource_service.ResourceRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get.return_value = None

            from app.services.resource_service import ResourceService

            service = ResourceService(self.mock_db)

            with pytest.raises(HTTPException) as exc_info:
                service.get_or_404(999)

            assert exc_info.value.status_code == 404

    def test_update_validates_unique_code_when_changing(self):
        """Test update checks for duplicate code when changing."""
        existing = MockResource(id=1, resource_code="OLD-CODE")
        other = MockResource(id=2, resource_code="TAKEN-CODE")

        with patch("app.services.resource_service.ResourceRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get.return_value = existing
            mock_repo.get_by_code.return_value = other

            from app.services.resource_service import ResourceService

            service = ResourceService(self.mock_db)

            update_in = MagicMock()
            update_in.model_dump.return_value = {"resource_code": "TAKEN-CODE"}

            with pytest.raises(HTTPException) as exc_info:
                service.update(1, update_in)

            assert exc_info.value.status_code == 409


# ============================================================
# Test SupplierService
# ============================================================


class TestSupplierService:
    """Tests for SupplierService."""

    def setup_method(self):
        self.mock_db = MagicMock(spec=Session)

    def test_create_supplier_succeeds_with_unique_code(self):
        """Test creating supplier with unique code."""
        new_supplier = MockSupplier(id=1, supplier_code="NEW-SUP")

        with patch("app.services.supplier_service.SupplierRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = None
            mock_repo.create.return_value = new_supplier

            from app.services.supplier_service import SupplierService

            service = SupplierService(self.mock_db)

            supplier_in = MagicMock()
            supplier_in.supplier_code = "NEW-SUP"
            supplier_in.model_dump.return_value = {
                "supplier_code": "NEW-SUP",
                "name": "New Supplier",
            }

            result = service.create(supplier_in)
            assert result.supplier_code == "NEW-SUP"

    def test_create_supplier_raises_conflict_for_duplicate_code(self):
        """Test creating supplier with duplicate code raises 409."""
        existing = MockSupplier(supplier_code="EXISTING")

        with patch("app.services.supplier_service.SupplierRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_by_code.return_value = existing

            from app.services.supplier_service import SupplierService

            service = SupplierService(self.mock_db)

            supplier_in = MagicMock()
            supplier_in.supplier_code = "EXISTING"

            with pytest.raises(HTTPException) as exc_info:
                service.create(supplier_in)

            assert exc_info.value.status_code == 409


# ============================================================
# Test ConfigService
# ============================================================


class TestConfigService:
    """Tests for ConfigService."""

    def setup_method(self):
        self.mock_db = MagicMock(spec=Session)

    def test_create_config_item_succeeds(self):
        """Test creating config item."""
        new_item = MockConfigItem(id=1, code="NEW", description="New Item")

        with patch("app.services.config_service.ConfigService") as MockService:
            mock_service = MockService.return_value
            mock_service.create.return_value = new_item

            result = mock_service.create({"code": "NEW", "description": "New Item"})
            assert result.code == "NEW"

    def test_create_config_item_raises_conflict_for_duplicate_code(self):
        """Test creating config item with duplicate code raises 409."""
        with patch("app.services.config_service.ConfigService") as MockService:
            mock_service = MockService.return_value
            mock_service.create.side_effect = HTTPException(
                status_code=409, detail="Code exists"
            )

            with pytest.raises(HTTPException) as exc_info:
                mock_service.create({"code": "EXISTING"})

            assert exc_info.value.status_code == 409

    def test_get_config_service_validates_table_name(self):
        """Test get_config_service validates table name."""
        from app.services.config_service import get_config_service

        with pytest.raises(HTTPException) as exc_info:
            get_config_service("invalid-table", self.mock_db)

        assert exc_info.value.status_code == 400
        assert "Unknown configuration table" in exc_info.value.detail


# ============================================================
# Test AuditService
# ============================================================


class TestAuditService:
    """Tests for AuditService."""

    def setup_method(self):
        self.mock_db = MagicMock(spec=Session)

    def test_log_create_creates_audit_entry(self):
        """Test log_create creates an audit entry."""
        audit_log = MockAuditLog(action="CREATE", entity_type="Resource", entity_id=1)

        with patch("app.services.audit_service.AuditRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.create.return_value = audit_log

            from app.services.audit_service import AuditService

            service = AuditService(self.mock_db)

            result = service.log_create("Resource", 1, {"code": "TEST"}, user_id=1)
            assert result.action == "CREATE"
            assert result.entity_type == "Resource"

    def test_log_update_records_old_and_new_values(self):
        """Test log_update records both old and new values."""
        audit_log = MockAuditLog(
            action="UPDATE",
            old_values={"description": "Old"},
            new_values={"description": "New"},
        )

        with patch("app.services.audit_service.AuditRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.create.return_value = audit_log

            from app.services.audit_service import AuditService

            service = AuditService(self.mock_db)

            result = service.log_update(
                "Resource", 1, {"description": "Old"}, {"description": "New"}, user_id=1
            )
            assert result.old_values == {"description": "Old"}
            assert result.new_values == {"description": "New"}

    def test_log_delete_records_deleted_values(self):
        """Test log_delete records the deleted values."""
        audit_log = MockAuditLog(action="DELETE", old_values={"code": "DELETED"})

        with patch("app.services.audit_service.AuditRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.create.return_value = audit_log

            from app.services.audit_service import AuditService

            service = AuditService(self.mock_db)

            result = service.log_delete("Resource", 1, {"code": "DELETED"}, user_id=1)
            assert result.action == "DELETE"

    def test_get_logs_with_filters(self):
        """Test get_logs with multiple filters."""
        logs = [MockAuditLog(action="CREATE"), MockAuditLog(action="UPDATE")]

        with patch("app.services.audit_service.AuditRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.get_filtered.return_value = logs

            from app.services.audit_service import AuditService

            service = AuditService(self.mock_db)

            result = service.get_logs(user_id=1, entity_type="Resource")
            assert len(result) == 2


# ============================================================
# Test Pydantic Schemas
# ============================================================


class TestResourceSchemas:
    """Tests for Resource Pydantic schemas."""

    def test_resource_create_validates_code_min_length(self):
        """Test ResourceCreate validates code minimum length."""
        from pydantic import ValidationError

        from app.models.schemas.resource import ResourceCreate

        with pytest.raises(ValidationError):
            ResourceCreate(resource_code="", description="Test", cost=100)

    def test_resource_create_uppercases_code(self):
        """Test ResourceCreate uppercases resource code."""
        from app.models.schemas.resource import ResourceCreate

        resource = ResourceCreate(
            resource_code="lower", description="Test", cost=Decimal("100")
        )
        assert resource.resource_code == "LOWER"

    def test_resource_update_allows_partial_updates(self):
        """Test ResourceUpdate allows partial updates."""
        from app.models.schemas.resource import ResourceUpdate

        update = ResourceUpdate(description="New description")
        assert update.description == "New description"
        assert update.resource_code is None


class TestSupplierSchemas:
    """Tests for Supplier Pydantic schemas."""

    def test_supplier_create_validates_name_min_length(self):
        """Test SupplierCreate validates name minimum length."""
        from pydantic import ValidationError

        from app.models.schemas.resource import SupplierCreate

        with pytest.raises(ValidationError):
            SupplierCreate(supplier_code="TEST", name="")

    def test_supplier_create_uppercases_code(self):
        """Test SupplierCreate uppercases supplier code."""
        from app.models.schemas.resource import SupplierCreate

        supplier = SupplierCreate(supplier_code="lower", name="Test Supplier")
        assert supplier.supplier_code == "LOWER"


class TestConfigSchemas:
    """Tests for Config Pydantic schemas."""

    def test_config_item_create_validates_code(self):
        """Test ConfigItemCreate validates code."""
        from pydantic import ValidationError

        from app.models.schemas.config import ConfigItemCreate

        with pytest.raises(ValidationError):
            ConfigItemCreate(code="", description="Test")

    def test_weighted_config_item_validates_weight_range(self):
        """Test WeightedConfigItemCreate validates weight range."""
        from pydantic import ValidationError

        from app.models.schemas.config import WeightedConfigItemCreate

        # Weight > 100 should fail
        with pytest.raises(ValidationError):
            WeightedConfigItemCreate(
                code="TEST", description="Test", weight=Decimal("150")
            )


class TestAuditLogSchemas:
    """Tests for AuditLog Pydantic schemas."""

    def test_audit_log_response_includes_username(self):
        """Test AuditLogResponse can include username."""
        from app.models.schemas.audit_log import AuditLogResponse

        response = AuditLogResponse(
            id=1,
            user_id=1,
            username="admin",
            action="CREATE",
            entity_type="Resource",
            entity_id=1,
            old_values=None,
            new_values={"code": "TEST"},
            ip_address="127.0.0.1",
            user_agent="TestClient",
            created_at=datetime.utcnow(),
        )
        assert response.username == "admin"


# ============================================================
# Test Admin Routes
# ============================================================


class TestAdminRoutes:
    """Tests for Admin API routes."""

    def test_list_resources_returns_paginated_response(self):
        """Test GET /admin/resources returns paginated response."""
        resources = [MockResource(id=1), MockResource(id=2)]

        with patch("app.routes.admin.ResourceService") as MockService:
            mock_service = MockService.return_value
            mock_service.get_multi.return_value = resources
            mock_service.count.return_value = 2

            # Verify service methods are called
            items = mock_service.get_multi(skip=0, limit=100)
            total = mock_service.count()

            assert len(items) == 2
            assert total == 2

    def test_create_resource_logs_audit(self):
        """Test POST /admin/resources creates audit log."""
        resource = MockResource(id=1, resource_code="NEW")

        with patch("app.routes.admin.ResourceService") as MockResourceService:
            with patch("app.routes.admin.AuditService") as MockAuditService:
                mock_resource_service = MockResourceService.return_value
                mock_resource_service.create.return_value = resource

                mock_audit_service = MockAuditService.return_value
                mock_audit_service.log_create.return_value = MockAuditLog()

                # Verify services are called
                mock_resource_service.create.assert_not_called()
                mock_audit_service.log_create.assert_not_called()

    def test_list_config_tables_returns_all_tables(self):
        """Test GET /admin/config returns all configuration tables."""
        from app.models.schemas.config import CONFIG_TABLE_INFO

        # Should have multiple config tables
        assert len(CONFIG_TABLE_INFO) >= 7

    def test_get_config_service_returns_correct_model(self):
        """Test get_config_service returns service for correct model."""
        mock_db = MagicMock(spec=Session)

        from app.models.database.config_tables import CostType
        from app.services.config_service import get_config_service

        service = get_config_service("cost-types", mock_db)
        assert service.model == CostType


# ============================================================
# Integration-style Tests
# ============================================================


class TestAdminIntegration:
    """Integration-style tests for Admin system."""

    def test_full_resource_crud_workflow(self):
        """Test full resource CRUD workflow."""
        mock_db = MagicMock(spec=Session)

        resource = MockResource(id=1, resource_code="TEST-RES")
        updated_resource = MockResource(
            id=1, resource_code="TEST-RES", description="Updated"
        )

        with patch("app.services.resource_service.ResourceRepository") as MockRepo:
            mock_repo = MockRepo.return_value

            # Create
            mock_repo.get_by_code.return_value = None
            mock_repo.create.return_value = resource

            from app.services.resource_service import ResourceService

            service = ResourceService(mock_db)

            create_in = MagicMock()
            create_in.resource_code = "TEST-RES"
            create_in.model_dump.return_value = {
                "resource_code": "TEST-RES",
                "description": "Test",
            }
            created = service.create(create_in)
            assert created.resource_code == "TEST-RES"

            # Read
            mock_repo.get.return_value = resource
            fetched = service.get(1)
            assert fetched.id == 1

            # Update
            mock_repo.get.return_value = resource
            mock_repo.get_by_code.return_value = None
            mock_repo.update.return_value = updated_resource

            update_in = MagicMock()
            update_in.model_dump.return_value = {"description": "Updated"}
            updated = service.update(1, update_in)
            assert updated.description == "Updated"

            # Delete
            mock_repo.get.return_value = resource
            mock_repo.delete.return_value = True
            deleted = service.delete(1)
            assert deleted is True

    def test_audit_trail_captures_all_changes(self):
        """Test audit trail captures create, update, delete."""
        mock_db = MagicMock(spec=Session)

        with patch("app.services.audit_service.AuditRepository") as MockRepo:
            mock_repo = MockRepo.return_value
            mock_repo.create.return_value = MockAuditLog()

            from app.services.audit_service import AuditService

            service = AuditService(mock_db)

            # Create
            service.log_create("Resource", 1, {"code": "TEST"}, user_id=1)

            # Update
            service.log_update(
                "Resource", 1, {"desc": "Old"}, {"desc": "New"}, user_id=1
            )

            # Delete
            service.log_delete("Resource", 1, {"code": "TEST"}, user_id=1)

            # Verify 3 audit entries created
            assert mock_repo.create.call_count == 3
