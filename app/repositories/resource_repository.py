"""Resource repository for data access operations."""

from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.database.resource import Resource, Supplier
from app.repositories.base import BaseRepository


class ResourceRepository(BaseRepository[Resource]):
    """Repository for Resource CRUD operations."""

    def __init__(self, db: Session):
        super().__init__(Resource, db)

    def get_by_code(self, resource_code: str) -> Optional[Resource]:
        """Get a resource by its unique code."""
        stmt = select(Resource).where(Resource.resource_code == resource_code)
        return self.db.scalar(stmt)

    def get_active(self, skip: int = 0, limit: int = 100) -> List[Resource]:
        """Get active resources with pagination."""
        stmt = (
            select(Resource)
            .where(Resource.is_active.is_(True))
            .order_by(Resource.resource_code)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_active(self) -> int:
        """Count active resources."""
        stmt = (
            select(func.count())
            .select_from(Resource)
            .where(Resource.is_active.is_(True))
        )
        return self.db.scalar(stmt) or 0

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Resource]:
        """Search resources by code or description."""
        search_term = f"%{query}%"
        stmt = (
            select(Resource)
            .where(
                or_(
                    Resource.resource_code.ilike(search_term),
                    Resource.description.ilike(search_term),
                    Resource.eoc.ilike(search_term),
                )
            )
            .order_by(Resource.resource_code)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_search(self, query: str) -> int:
        """Count search results."""
        search_term = f"%{query}%"
        stmt = (
            select(func.count())
            .select_from(Resource)
            .where(
                or_(
                    Resource.resource_code.ilike(search_term),
                    Resource.description.ilike(search_term),
                    Resource.eoc.ilike(search_term),
                )
            )
        )
        return self.db.scalar(stmt) or 0

    @staticmethod
    def _filters(search: Optional[str], active_only: bool, supplier_code):
        conditions = []
        if search:
            term = f"%{search}%"
            conditions.append(
                or_(
                    Resource.resource_code.ilike(term),
                    Resource.description.ilike(term),
                    Resource.eoc.ilike(term),
                )
            )
        if active_only:
            conditions.append(Resource.is_active.is_(True))
        if supplier_code:
            conditions.append(Resource.supplier_code == supplier_code)
        return conditions

    def list_filtered(
        self,
        search: Optional[str] = None,
        active_only: bool = False,
        supplier_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Resource]:
        """Resources matching every given filter, ordered by code."""
        stmt = (
            select(Resource)
            .where(*self._filters(search, active_only, supplier_code))
            .order_by(Resource.resource_code)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_filtered(
        self,
        search: Optional[str] = None,
        active_only: bool = False,
        supplier_code: Optional[str] = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Resource)
            .where(*self._filters(search, active_only, supplier_code))
        )
        return self.db.scalar(stmt) or 0

    def supplier_names(self, codes) -> dict:
        """Map supplier code -> name for the given codes, in one query."""
        codes = {c for c in codes if c}
        if not codes:
            return {}
        stmt = select(Supplier.supplier_code, Supplier.name).where(
            Supplier.supplier_code.in_(codes)
        )
        return {code: name for code, name in self.db.execute(stmt).all()}

    def supplier_exists(self, supplier_code: str) -> bool:
        stmt = select(Supplier.id).where(Supplier.supplier_code == supplier_code)
        return self.db.scalar(stmt) is not None
