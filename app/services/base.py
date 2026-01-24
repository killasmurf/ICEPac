"""Base service class."""
from typing import Generic, TypeVar, Type, Optional, List

from sqlalchemy.orm import Session

from app.core.database import Base
from app.repositories.base import BaseRepository

ModelType = TypeVar("ModelType", bound=Base)


class BaseService(Generic[ModelType]):
    """Generic service wrapping a repository with business logic hooks."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.db = db
        self.repository = BaseRepository(model, db)

    def get(self, id: int) -> Optional[ModelType]:
        return self.repository.get(id)

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.repository.get_multi(skip=skip, limit=limit)

    def count(self) -> int:
        return self.repository.count()

    def create(self, obj_in: dict) -> ModelType:
        return self.repository.create(obj_in)

    def update(self, id: int, obj_in: dict) -> Optional[ModelType]:
        db_obj = self.repository.get(id)
        if not db_obj:
            return None
        return self.repository.update(db_obj, obj_in)

    def delete(self, id: int) -> bool:
        return self.repository.delete(id)
