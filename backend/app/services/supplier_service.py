"""Supplier service with business logic."""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.supplier_repository import SupplierRepository
from app.models.schemas.resource import SupplierCreate, SupplierUpdate, SupplierResponse


class SupplierService:
    def __init__(self, db: Session):
        self.repo = SupplierRepository(db)

    def get_supplier(self, supplier_id: int) -> SupplierResponse:
        supplier = self.repo.get_by_id(supplier_id)
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supplier {supplier_id} not found")
        return SupplierResponse.from_orm(supplier)

    def list_suppliers(self, skip: int = 0, limit: int = 100, search: Optional[str] = None,
                       is_active: Optional[bool] = None) -> Dict[str, Any]:
        if search:
            items = self.repo.search(search, skip=skip, limit=limit, is_active=is_active)
        else:
            filters = {"is_active": is_active} if is_active is not None else None
            items = self.repo.get_all(skip=skip, limit=limit, filters=filters)
        total = self.repo.count(filters={"is_active": is_active} if is_active is not None else None)
        return {"items": [SupplierResponse.from_orm(s) for s in items], "total": total, "skip": skip, "limit": limit}

    def create_supplier(self, data: SupplierCreate, user_id: int) -> SupplierResponse:
        if self.repo.get_by_name(data.name):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Supplier '{data.name}' exists")
        d = data.dict()
        d["created_by"] = d["updated_by"] = user_id
        return SupplierResponse.from_orm(self.repo.create(d))

    def update_supplier(self, supplier_id: int, data: SupplierUpdate, user_id: int) -> SupplierResponse:
        existing = self.repo.get_by_id(supplier_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supplier {supplier_id} not found")
        if data.name and data.name != existing.name and self.repo.get_by_name(data.name):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Name '{data.name}' in use")
        d = data.dict(exclude_unset=True)
        d["updated_by"] = user_id
        return SupplierResponse.from_orm(self.repo.update(supplier_id, d))

    def delete_supplier(self, supplier_id: int) -> bool:
        if not self.repo.get_by_id(supplier_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supplier {supplier_id} not found")
        return self.repo.delete(supplier_id)
