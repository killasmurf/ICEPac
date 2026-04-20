"""Resource repository for data access operations."""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.repositories.base import BaseRepository
from app.models.database.resource import Resource


class ResourceRepository(BaseRepository[Resource]):
    def __init__(self, db: Session):
        super().__init__(Resource, db)

    def search(self, query: str, skip: int = 0, limit: int = 100,
               eoc: Optional[str] = None, is_active: Optional[bool] = None) -> List[Resource]:
        q = self.db.query(Resource).filter(or_(
            Resource.resource_code.ilike(f"%{query}%"),
            Resource.description.ilike(f"%{query}%"),
            Resource.supplier_name.ilike(f"%{query}%"),
        ))
        if eoc is not None:
            q = q.filter(Resource.eoc == eoc)
        if is_active is not None:
            q = q.filter(Resource.is_active == is_active)
        return q.offset(skip).limit(limit).all()

    def get_by_code(self, resource_code: str) -> Optional[Resource]:
        return self.db.query(Resource).filter(Resource.resource_code == resource_code).first()

    def get_by_eoc(self, eoc: str, skip: int = 0, limit: int = 100) -> List[Resource]:
        return self.db.query(Resource).filter(Resource.eoc == eoc, Resource.is_active == True).order_by(Resource.resource_code).offset(skip).limit(limit).all()

    def count_by_eoc(self) -> dict:
        results = self.db.query(Resource.eoc, func.count(Resource.id)).filter(Resource.is_active == True).group_by(Resource.eoc).all()
        return {eoc: count for eoc, count in results}
