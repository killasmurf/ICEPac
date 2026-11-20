"""User repository."""

from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.database.user import User, UserRole
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

    # Sort keys accepted by the admin list; "role" sorts by the stored value.
    SORT_COLUMNS = {
        "username": User.username,
        "full_name": User.full_name,
        "email": User.email,
        "role": User.role,
        "last_login": User.last_login,
        "created_at": User.created_at,
    }

    @staticmethod
    def _filters(
        search: Optional[str], role: Optional[UserRole], is_active: Optional[bool]
    ):
        conditions = []
        if search:
            term = f"%{search.strip().lower()}%"
            conditions.append(
                or_(
                    func.lower(User.username).like(term),
                    func.lower(User.email).like(term),
                    func.lower(func.coalesce(User.full_name, "")).like(term),
                )
            )
        if role is not None:
            conditions.append(User.role == role)
        if is_active is not None:
            conditions.append(User.is_active.is_(is_active))
        return conditions

    def list_filtered(
        self,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        sort: str = "id",
        order: str = "asc",
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """Users matching the filters, ordered in SQL.

        NULLs (e.g. a user who never logged in) sort last in both directions,
        and ``id`` breaks ties so paging is stable.
        """
        stmt = select(User).where(*self._filters(search, role, is_active))
        if sort != "id":
            column = self.SORT_COLUMNS[sort]
            direction = column.desc() if order == "desc" else column.asc()
            stmt = stmt.order_by(direction.nulls_last())
        id_order = User.id.desc() if order == "desc" else User.id.asc()
        stmt = stmt.order_by(id_order).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_filtered(
        self,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(User)
            .where(*self._filters(search, role, is_active))
        )
        return self.db.scalar(stmt) or 0
