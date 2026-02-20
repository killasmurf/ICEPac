"""Supplier service with business logic."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.resource import Supplier
from app.models.schemas.resource import SupplierCreate, SupplierUpdate
from app.repositories.supplier_repository import SupplierRepository


class SupplierService:
    """Service layer for Supplier operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = SupplierRepository(db)

    def get(self, supplier_id: int) -> Optional[Supplier]:
        """Get a supplier by ID."""
        return self.repository.get(supplier_id)

    def get_or_404(self, supplier_id: int) -> Supplier:
        """Get a supplier by ID or raise 404."""
        supplier = self.repository.get(supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier with ID {supplier_id} not found",
            )
        return supplier

    def get_by_code(self, supplier_code: str) -> Optional[Supplier]:
        """Get a supplier by its unique code."""
        return self.repository.get_by_code(supplier_code)

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[Supplier]:
        """Get multiple suppliers with pagination."""
        return self.repository.get_multi(skip=skip, limit=limit)

    def get_active(self, skip: int = 0, limit: int = 100) -> List[Supplier]:
        """Get active suppliers with pagination."""
        return self.repository.get_active(skip=skip, limit=limit)

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Supplier]:
        """Search suppliers by code, name, or contact info."""
        return self.repository.search(query, skip=skip, limit=limit)

    def count(self) -> int:
        """Count total suppliers."""
        return self.repository.count()

    def count_active(self) -> int:
        """Count active suppliers."""
        return self.repository.count_active()

    def count_search(self, query: str) -> int:
        """Count search results."""
        return self.repository.count_search(query)

    def create(self, supplier_in: SupplierCreate) -> Supplier:
        """Create a new supplier."""
        # Check for duplicate code
        existing = self.repository.get_by_code(supplier_in.supplier_code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Supplier with code "
                    f"'{supplier_in.supplier_code}' already exists"
                ),
            )

        data = supplier_in.model_dump()
        return self.repository.create(data)

    def update(self, supplier_id: int, supplier_in: SupplierUpdate) -> Supplier:
        """Update an existing supplier."""
        supplier = self.get_or_404(supplier_id)
        update_data = supplier_in.model_dump(exclude_unset=True)

        # Check for duplicate code if changing
        if (
            "supplier_code" in update_data
            and update_data["supplier_code"] != supplier.supplier_code
        ):
            existing = self.repository.get_by_code(update_data["supplier_code"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Supplier with code "
                        f"'{update_data['supplier_code']}' already exists"
                    ),
                )

        return self.repository.update(supplier, update_data)

    def delete(self, supplier_id: int) -> bool:
        """Delete a supplier."""
        self.get_or_404(supplier_id)  # Verify exists
        return self.repository.delete(supplier_id)

    def deactivate(self, supplier_id: int) -> Supplier:
        """Soft delete by deactivating a supplier."""
        supplier = self.get_or_404(supplier_id)
        return self.repository.update(supplier, {"is_active": False})

    def activate(self, supplier_id: int) -> Supplier:
        """Reactivate a deactivated supplier."""
        supplier = self.get_or_404(supplier_id)
        return self.repository.update(supplier, {"is_active": True})
