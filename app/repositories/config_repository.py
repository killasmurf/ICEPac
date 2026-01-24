"""Generic repository for configuration/lookup tables."""
from typing import Optional, Type

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.repositories.base import BaseRepository


class ConfigRepository(BaseRepository):
    """Repository for code/description lookup tables."""

    def __init__(self, model: Type[Base], db: Session):
        super().__init__(model, db)

    def get_by_code(self, code: str) -> Optional[Base]:
        stmt = select(self.model).where(self.model.code == code)
        return self.db.scalars(stmt).first()

    def get_all(self):
        """Get all records (no pagination - config tables are small)."""
        stmt = select(self.model).order_by(self.model.code)
        return list(self.db.scalars(stmt).all())
