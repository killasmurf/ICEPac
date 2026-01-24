"""Project service."""
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.project import Project
from app.models.schemas.project import ProjectCreate, ProjectUpdate
from app.repositories.project_repository import ProjectRepository


class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ProjectRepository(db)

    def get(self, project_id: int) -> Optional[Project]:
        return self.repository.get(project_id)

    def get_or_404(self, project_id: int) -> Project:
        project = self.repository.get(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get active (non-archived) projects."""
        return self.repository.get_active(skip=skip, limit=limit)

    def count(self) -> int:
        """Count active projects."""
        return self.repository.count_active()

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Project]:
        return self.repository.search(query, skip=skip, limit=limit)

    def count_search(self, query: str) -> int:
        return self.repository.count_search(query)

    def create(self, project_in: ProjectCreate) -> Project:
        return self.repository.create(project_in.model_dump())

    def update(self, project_id: int, project_in: ProjectUpdate) -> Project:
        project = self.get_or_404(project_id)
        update_data = project_in.model_dump(exclude_unset=True)
        return self.repository.update(project, update_data)

    def delete(self, project_id: int) -> bool:
        """Archive a project (soft delete)."""
        project = self.get_or_404(project_id)
        self.repository.update(project, {"archived": True})
        return True
