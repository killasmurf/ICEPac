"""Project repository."""
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.database.project import Project
from app.repositories.base import BaseRepository


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
