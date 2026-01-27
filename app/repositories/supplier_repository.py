"""Supplier repository for data access operations."""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from app.models.database.resource import Supplier
from app.repositories.base import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    """Repository for Supplier CRUD operations."""

    def __init__(self, db: Session):
        super().__init__(Supplier, db)

    def get_by_code(self, supplier_code: str) -> Optional[Supplier]:
        """Get a supplier by its unique code."""
        stmt = select(Supplier).where(Supplier.supplier_code == supplier_code)
        return self.db.scalar(stmt)

    def get_active(self, skip: int = 0, limit: int = 100) -> List[Supplier]:
        """Get active suppliers with pagination."""
        stmt = (
            select(Supplier)
            .where(Supplier.is_active == True)
            .order_by(Supplier.name)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_active(self) -> int:
        """Count active suppliers."""
        stmt = select(func.count()).select_from(Supplier).where(Supplier.is_active == True)
        return self.db.scalar(stmt) or 0

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Supplier]:
        """Search suppliers by code, name, or contact info."""
        search_term = f"%{query}%"
        stmt = (
            select(Supplier)
            .where(
                or_(
                    Supplier.supplier_code.ilike(search_term),
                    Supplier.name.ilike(search_term),
                    Supplier.contact.ilike(search_term),
                    Supplier.email.ilike(search_term),
                )
            )
            .order_by(Supplier.name)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_search(self, query: str) -> int:
        """Count search results."""
        search_term = f"%{query}%"
        stmt = (
            select(func.count())
            .select_from(Supplier)
            .where(
                or_(
                    Supplier.supplier_code.ilike(search_term),
                    Supplier.name.ilike(search_term),
                    Supplier.contact.ilike(search_term),
                    Supplier.email.ilike(search_term),
                )
            )
        )
        return self.db.scalar(stmt) or 0
