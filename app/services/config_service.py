"""Generic configuration table service."""
from typing import Type, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import Base
from app.repositories.config_repository import ConfigRepository


class ConfigService:
    """Generic service for code/description lookup tables."""

    def __init__(self, model: Type[Base], db: Session):
        self.repository = ConfigRepository(model, db)

    def get(self, item_id: int):
        return self.repository.get(item_id)

    def get_or_404(self, item_id: int):
        item = self.repository.get(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        return item

    def get_all(self) -> List:
        return self.repository.get_all()

    def count(self) -> int:
        return self.repository.count()

    def create(self, data: dict):
        if self.repository.get_by_code(data["code"]):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Code already exists")
        return self.repository.create(data)

    def update(self, item_id: int, data: dict):
        item = self.get_or_404(item_id)
        if "code" in data and data["code"] != item.code:
            if self.repository.get_by_code(data["code"]):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Code already exists")
        return self.repository.update(item, data)

    def delete(self, item_id: int) -> bool:
        self.get_or_404(item_id)
        return self.repository.delete(item_id)
