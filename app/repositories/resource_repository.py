"""Resource and Supplier repositories."""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database.resource import Resource, Supplier
from app.repositories.base import BaseRepository


class ResourceRepository(BaseRepository[Resource]):
    def __init__(self, db: Session):
        super().__init__(Resource, db)

    def get_by_code(self, code: str) -> Optional[Resource]:
        stmt = select(Resource).where(Resource.resource_code == code)
        return self.db.scalars(stmt).first()

    def search(self, query: str, skip: int = 0, limit: int = 100):
        stmt = (
            select(Resource)
            .where(
                Resource.description.ilike(f"%{query}%")
                | Resource.resource_code.ilike(f"%{query}%")
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())


class SupplierRepository(BaseRepository[Supplier]):
    def __init__(self, db: Session):
        super().__init__(Supplier, db)

    def get_by_code(self, code: str) -> Optional[Supplier]:
        stmt = select(Supplier).where(Supplier.supplier_code == code)
        return self.db.scalars(stmt).first()

    def search(self, query: str, skip: int = 0, limit: int = 100):
        stmt = (
            select(Supplier)
            .where(
                Supplier.name.ilike(f"%{query}%")
                | Supplier.supplier_code.ilike(f"%{query}%")
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
