"""Base repository with common CRUD operations."""
from typing import TypeVar, Generic, Type, Optional, List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: int) -> Optional[T]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, skip: int = 0, limit: int = 100, sort_by: Optional[str] = None,
                sort_order: str = "asc", filters: Optional[Dict[str, Any]] = None) -> List[T]:
        query = self.db.query(self.model)
        if filters:
            for key, value in filters.items():
                if value is not None and hasattr(self.model, key):
                    col = getattr(self.model, key)
                    query = query.filter(col.ilike(f"%{value}%") if isinstance(value, str) else col == value)
        if sort_by and hasattr(self.model, sort_by):
            col = getattr(self.model, sort_by)
            query = query.order_by(desc(col) if sort_order == "desc" else asc(col))
        else:
            query = query.order_by(asc(self.model.id))
        return query.offset(skip).limit(limit).all()

    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.db.query(func.count(self.model.id))
        if filters:
            for key, value in filters.items():
                if value is not None and hasattr(self.model, key):
                    col = getattr(self.model, key)
                    query = query.filter(col.ilike(f"%{value}%") if isinstance(value, str) else col == value)
        return query.scalar() or 0

    def create(self, data: Dict[str, Any]) -> T:
        instance = self.model(**data)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def update(self, id: int, data: Dict[str, Any]) -> Optional[T]:
        instance = self.get_by_id(id)
        if not instance:
            return None
        for key, value in data.items():
            if hasattr(instance, key) and value is not None:
                setattr(instance, key, value)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete(self, id: int) -> bool:
        instance = self.get_by_id(id)
        if not instance:
            return False
        self.db.delete(instance)
        self.db.commit()
        return True

    def exists(self, **kwargs) -> bool:
        query = self.db.query(self.model)
        for key, value in kwargs.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        return query.first() is not None

    def get_by_field(self, field: str, value: Any) -> Optional[T]:
        if not hasattr(self.model, field):
            return None
        return self.db.query(self.model).filter(getattr(self.model, field) == value).first()
