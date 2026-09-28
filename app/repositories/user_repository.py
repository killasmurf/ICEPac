"""User repository."""
from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.database.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        return self.db.scalars(stmt).first()

    def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username)
        return self.db.scalars(stmt).first()

    def get_active_users(self, skip: int = 0, limit: int = 100):
        stmt = select(User).where(User.is_active.is_(True)).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def search(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        active_only: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        stmt = select(User)
        if search:
            term = f"%{search}%"
            stmt = stmt.where(
                or_(
                    User.username.ilike(term),
                    User.email.ilike(term),
                    User.full_name.ilike(term),
                )
            )
        if role:
            stmt = stmt.where(User.role == role)
        if active_only is True:
            stmt = stmt.where(User.is_active.is_(True))
        stmt = stmt.offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_search(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        active_only: Optional[bool] = None,
    ) -> int:
        stmt = select(func.count()).select_from(User)
        if search:
            term = f"%{search}%"
            stmt = stmt.where(
                or_(
                    User.username.ilike(term),
                    User.email.ilike(term),
                    User.full_name.ilike(term),
                )
            )
        if role:
            stmt = stmt.where(User.role == role)
        if active_only is True:
            stmt = stmt.where(User.is_active.is_(True))
        return self.db.scalar(stmt) or 0
