"""Supplier repository for data access operations."""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.repositories.base import BaseRepository
from app.models.database.resource import Supplier


class SupplierRepository(BaseRepository[Supplier]):
    def __init__(self, db: Session):
        super().__init__(Supplier, db)

    def search(self, query: str, skip: int = 0, limit: int = 100,
               is_active: Optional[bool] = None) -> List[Supplier]:
        q = self.db.query(Supplier).filter(or_(
            Supplier.name.ilike(f"%{query}%"),
            Supplier.contact_name.ilike(f"%{query}%"),
            Supplier.email.ilike(f"%{query}%"),
        ))
        if is_active is not None:
            q = q.filter(Supplier.is_active == is_active)
        return q.offset(skip).limit(limit).all()

    def get_by_name(self, name: str) -> Optional[Supplier]:
        return self.db.query(Supplier).filter(Supplier.name == name).first()

    def get_active(self, skip: int = 0, limit: int = 100) -> List[Supplier]:
        return self.db.query(Supplier).filter(Supplier.is_active == True).order_by(Supplier.name).offset(skip).limit(limit).all()
