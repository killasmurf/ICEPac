"""Configuration table service for dynamic CRUD on lookup tables."""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.base import BaseRepository
from app.models.database.config_tables import ALL_CONFIG_MODELS, WEIGHTED_TABLES


def is_weighted_table(table_name: str) -> bool:
    return table_name in WEIGHTED_TABLES


def get_config_service(table_name: str, db: Session) -> "ConfigService":
    if table_name not in ALL_CONFIG_MODELS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Table '{table_name}' not found. Available: {list(ALL_CONFIG_MODELS.keys())}")
    return ConfigService(ALL_CONFIG_MODELS[table_name], table_name, db)


class ConfigService:
    def __init__(self, model, table_name: str, db: Session):
        self.repo = BaseRepository(model, db)
        self.model = model
        self.table_name = table_name

    def get_item(self, item_id: int) -> Any:
        item = self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item {item_id} not found in {self.table_name}")
        return item

    def list_items(self, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None) -> Dict[str, Any]:
        filters = {"is_active": is_active} if is_active is not None else None
        items = self.repo.get_all(skip=skip, limit=limit, sort_by="sort_order", filters=filters)
        total = self.repo.count(filters=filters)
        return {"items": items, "total": total, "table_name": self.table_name}

    def create_item(self, data: Dict[str, Any]) -> Any:
        if self.repo.get_by_field("name", data.get("name")):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"'{data.get('name')}' already exists")
        return self.repo.create(data)

    def update_item(self, item_id: int, data: Dict[str, Any]) -> Any:
        existing = self.repo.get_by_id(item_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item {item_id} not found")
        if "name" in data and data["name"] != existing.name and self.repo.get_by_field("name", data["name"]):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Name '{data['name']}' in use")
        return self.repo.update(item_id, data)

    def delete_item(self, item_id: int) -> bool:
        if not self.repo.get_by_id(item_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item {item_id} not found")
        return self.repo.delete(item_id)

    @staticmethod
    def list_tables() -> List[Dict[str, Any]]:
        from app.models.schemas.config import CONFIG_TABLE_INFO
        return [{"name": name, **info} for name, info in CONFIG_TABLE_INFO.items()]
