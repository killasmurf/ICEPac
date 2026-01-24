"""Resource and Supplier services."""
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.resource import Resource, Supplier
from app.models.schemas.resource import (
    ResourceCreate, ResourceUpdate,
    SupplierCreate, SupplierUpdate,
)
from app.repositories.resource_repository import ResourceRepository, SupplierRepository


class ResourceService:
    def __init__(self, db: Session):
        self.repository = ResourceRepository(db)

    def get(self, resource_id: int) -> Optional[Resource]:
        return self.repository.get(resource_id)

    def get_or_404(self, resource_id: int) -> Resource:
        resource = self.repository.get(resource_id)
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
        return resource

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[Resource]:
        return self.repository.get_multi(skip=skip, limit=limit)

    def count(self) -> int:
        return self.repository.count()

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Resource]:
        return self.repository.search(query, skip=skip, limit=limit)

    def create(self, resource_in: ResourceCreate) -> Resource:
        if self.repository.get_by_code(resource_in.resource_code):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Resource code already exists")
        return self.repository.create(resource_in.model_dump())

    def update(self, resource_id: int, resource_in: ResourceUpdate) -> Resource:
        resource = self.get_or_404(resource_id)
        update_data = resource_in.model_dump(exclude_unset=True)
        if "resource_code" in update_data and update_data["resource_code"] != resource.resource_code:
            if self.repository.get_by_code(update_data["resource_code"]):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Resource code already exists")
        return self.repository.update(resource, update_data)

    def delete(self, resource_id: int) -> bool:
        self.get_or_404(resource_id)
        return self.repository.delete(resource_id)


class SupplierService:
    def __init__(self, db: Session):
        self.repository = SupplierRepository(db)

    def get(self, supplier_id: int) -> Optional[Supplier]:
        return self.repository.get(supplier_id)

    def get_or_404(self, supplier_id: int) -> Supplier:
        supplier = self.repository.get(supplier_id)
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        return supplier

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[Supplier]:
        return self.repository.get_multi(skip=skip, limit=limit)

    def count(self) -> int:
        return self.repository.count()

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Supplier]:
        return self.repository.search(query, skip=skip, limit=limit)

    def create(self, supplier_in: SupplierCreate) -> Supplier:
        if self.repository.get_by_code(supplier_in.supplier_code):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Supplier code already exists")
        return self.repository.create(supplier_in.model_dump())

    def update(self, supplier_id: int, supplier_in: SupplierUpdate) -> Supplier:
        supplier = self.get_or_404(supplier_id)
        update_data = supplier_in.model_dump(exclude_unset=True)
        if "supplier_code" in update_data and update_data["supplier_code"] != supplier.supplier_code:
            if self.repository.get_by_code(update_data["supplier_code"]):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Supplier code already exists")
        return self.repository.update(supplier, update_data)

    def delete(self, supplier_id: int) -> bool:
        self.get_or_404(supplier_id)
        return self.repository.delete(supplier_id)
