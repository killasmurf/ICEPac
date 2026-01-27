"""Configuration table service for generic CRUD operations."""
from typing import Type, Optional, List, Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import Base
from app.models.database.config_tables import (
    CONFIG_MODELS, WEIGHTED_CONFIG_MODELS, ALL_CONFIG_MODELS
)


class ConfigService:
    """Generic service for configuration table CRUD operations.
    
    Provides a reusable service that works with any config table model.
    """

    def __init__(self, model: Type[Base], db: Session):
        self.model = model
        self.db = db

    def get(self, item_id: int) -> Optional[Any]:
        """Get a config item by ID."""
        return self.db.get(self.model, item_id)

    def get_or_404(self, item_id: int) -> Any:
        """Get a config item by ID or raise 404."""
        item = self.get(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.model.__name__} with ID {item_id} not found"
            )
        return item

    def get_by_code(self, code: str) -> Optional[Any]:
        """Get a config item by its unique code."""
        stmt = select(self.model).where(self.model.code == code)
        return self.db.scalar(stmt)

    def get_all(self) -> List[Any]:
        """Get all config items."""
        stmt = select(self.model).order_by(self.model.code)
        return list(self.db.scalars(stmt).all())

    def get_active(self) -> List[Any]:
        """Get all active config items."""
        stmt = (
            select(self.model)
            .where(self.model.is_active == True)
            .order_by(self.model.code)
        )
        return list(self.db.scalars(stmt).all())

    def count(self) -> int:
        """Count total config items."""
        stmt = select(func.count()).select_from(self.model)
        return self.db.scalar(stmt) or 0

    def create(self, data: dict) -> Any:
        """Create a new config item."""
        # Ensure code is uppercase
        if "code" in data:
            data["code"] = data["code"].upper().strip()

        # Check for duplicate code
        existing = self.get_by_code(data.get("code", ""))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{self.model.__name__} with code '{data['code']}' already exists"
            )

        db_obj = self.model(**data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, item_id: int, data: dict) -> Any:
        """Update an existing config item."""
        item = self.get_or_404(item_id)
        
        # Ensure code is uppercase if being updated
        if "code" in data and data["code"] is not None:
            data["code"] = data["code"].upper().strip()
            # Check for duplicate code if changing
            if data["code"] != item.code:
                existing = self.get_by_code(data["code"])
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"{self.model.__name__} with code '{data['code']}' already exists"
                    )

        for field, value in data.items():
            if value is not None and hasattr(item, field):
                setattr(item, field, value)

        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, item_id: int) -> bool:
        """Delete a config item."""
        item = self.get_or_404(item_id)
        self.db.delete(item)
        self.db.commit()
        return True

    def deactivate(self, item_id: int) -> Any:
        """Soft delete by deactivating a config item."""
        item = self.get_or_404(item_id)
        item.is_active = False
        self.db.commit()
        self.db.refresh(item)
        return item

    def activate(self, item_id: int) -> Any:
        """Reactivate a deactivated config item."""
        item = self.get_or_404(item_id)
        item.is_active = True
        self.db.commit()
        self.db.refresh(item)
        return item


def get_config_service(table_name: str, db: Session) -> ConfigService:
    """Factory function to get a ConfigService for a specific table.
    
    Args:
        table_name: The URL-friendly table name (e.g., 'cost-types')
        db: Database session
        
    Returns:
        ConfigService instance for the specified table
        
    Raises:
        HTTPException: If table name is not recognized
    """
    model = ALL_CONFIG_MODELS.get(table_name)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown configuration table: '{table_name}'. "
                   f"Valid tables: {list(ALL_CONFIG_MODELS.keys())}"
        )
    return ConfigService(model, db)


def is_weighted_table(table_name: str) -> bool:
    """Check if a table is a weighted config table."""
    return table_name in WEIGHTED_CONFIG_MODELS
