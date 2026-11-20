"""Project repository."""

from typing import List, Optional

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from app.models.database.project import Project, ProjectStatus
from app.repositories.base import BaseRepository

SORT_FIELDS = ("name", "created_at", "updated_at", "status", "manager")
TEXT_SORT_FIELDS = ("name", "status", "manager")


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, db: Session):
        super().__init__(Project, db)

    def get_active(self, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get non-archived projects."""
        stmt = (
            select(Project)
            .where(Project.archived.is_(False))
            .order_by(Project.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_active(self) -> int:
        """Count non-archived projects."""
        stmt = (
            select(func.count()).select_from(Project).where(Project.archived.is_(False))
        )
        return self.db.scalar(stmt) or 0

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Project]:
        """Search projects by name or description."""
        stmt = (
            select(Project)
            .where(
                Project.archived.is_(False),
                Project.project_name.ilike(f"%{query}%")
                | Project.description.ilike(f"%{query}%"),
            )
            .order_by(Project.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_search(self, query: str) -> int:
        """Count search results."""
        stmt = (
            select(func.count())
            .select_from(Project)
            .where(
                Project.archived.is_(False),
                Project.project_name.ilike(f"%{query}%")
                | Project.description.ilike(f"%{query}%"),
            )
        )
        return self.db.scalar(stmt) or 0

    def get_by_name(self, name: str) -> Optional[Project]:
        stmt = select(Project).where(Project.project_name == name)
        return self.db.scalars(stmt).first()

    # ------------------------------------------------------------------
    # Filtered, sorted listing (archived / status / search / sort)
    # ------------------------------------------------------------------

    @staticmethod
    def _filters(
        archived: bool, search: Optional[str], status: Optional[ProjectStatus]
    ) -> list:
        conditions = [Project.archived.is_(archived)]
        if search:
            conditions.append(
                Project.project_name.ilike(f"%{search}%")
                | Project.description.ilike(f"%{search}%")
            )
        if status is not None:
            conditions.append(Project.status == status)
        return conditions

    @staticmethod
    def _order_by(sort: Optional[str], order: Optional[str]) -> list:
        """ORDER BY clauses with a stable tiebreak on id.

        Default (no ``sort``) is ``updated_at desc, id desc``. When ``order`` is
        omitted, text fields sort ascending and date fields descending.
        """
        field = sort or "updated_at"
        column = {
            "name": Project.project_name,
            "created_at": Project.created_at,
            "updated_at": Project.updated_at,
            "status": cast(Project.status, String),
            "manager": Project.project_manager,
        }[field]
        direction = order or ("asc" if field in TEXT_SORT_FIELDS else "desc")
        if direction == "asc":
            return [column.asc(), Project.id.asc()]
        return [column.desc(), Project.id.desc()]

    def list_filtered(
        self,
        archived: bool = False,
        search: Optional[str] = None,
        status: Optional[ProjectStatus] = None,
        sort: Optional[str] = None,
        order: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        stmt = (
            select(Project)
            .where(*self._filters(archived, search, status))
            .order_by(*self._order_by(sort, order))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_filtered(
        self,
        archived: bool = False,
        search: Optional[str] = None,
        status: Optional[ProjectStatus] = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Project)
            .where(*self._filters(archived, search, status))
        )
        return self.db.scalar(stmt) or 0
