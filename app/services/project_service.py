"""Project service with business logic for projects and WBS."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.project import Project
from app.models.database.wbs import WBS
from app.models.schemas.project import (
    ProjectCreate, ProjectUpdate,
    WBSCreate, WBSUpdate,
)
from app.repositories.project_repository import ProjectRepository, WBSRepository


class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)
        self.wbs_repo = WBSRepository(db)

    # ------------------------------------------------------------------
    # Project CRUD
    # ------------------------------------------------------------------

    def get(self, project_id: int) -> Optional[Project]:
        return self.repo.get(project_id)

    def get_or_404(self, project_id: int) -> Project:
        project = self.repo.get(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project

    def get_with_wbs(self, project_id: int) -> Project:
        project = self.repo.get_with_wbs(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project

    def get_multi(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Project]:
        if active_only:
            return self.repo.get_multi_active(skip=skip, limit=limit)
        return self.repo.get_multi(skip=skip, limit=limit)

    def count(self, active_only: bool = True) -> int:
        if active_only:
            return self.repo.count_active()
        return self.repo.count()

    def create(self, project_in: ProjectCreate) -> Project:
        return self.repo.create(project_in.model_dump())

    def update(self, project_id: int, project_in: ProjectUpdate) -> Project:
        project = self.get_or_404(project_id)
        update_data = project_in.model_dump(exclude_unset=True)
        return self.repo.update(project, update_data)

    def archive(self, project_id: int) -> Project:
        project = self.get_or_404(project_id)
        return self.repo.update(project, {"archived": True})

    def delete(self, project_id: int) -> bool:
        self.get_or_404(project_id)
        return self.repo.delete(project_id)

    # ------------------------------------------------------------------
    # WBS CRUD
    # ------------------------------------------------------------------

    def get_wbs(self, wbs_id: int) -> Optional[WBS]:
        return self.wbs_repo.get(wbs_id)

    def get_wbs_or_404(self, wbs_id: int) -> WBS:
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="WBS item not found")
        return wbs

    def get_wbs_by_project(self, project_id: int, skip: int = 0, limit: int = 500) -> List[WBS]:
        self.get_or_404(project_id)
        return self.wbs_repo.get_by_project(project_id, skip=skip, limit=limit)

    def count_wbs_by_project(self, project_id: int) -> int:
        return self.wbs_repo.count_by_project(project_id)

    def create_wbs(self, project_id: int, wbs_in: WBSCreate) -> WBS:
        self.get_or_404(project_id)
        data = wbs_in.model_dump()
        data["project_id"] = project_id
        return self.wbs_repo.create(data)

    def update_wbs(self, wbs_id: int, wbs_in: WBSUpdate) -> WBS:
        wbs = self.get_wbs_or_404(wbs_id)
        return self.wbs_repo.update(wbs, wbs_in.model_dump(exclude_unset=True))

    def delete_wbs(self, wbs_id: int) -> bool:
        self.get_wbs_or_404(wbs_id)
        return self.wbs_repo.delete(wbs_id)

    # ------------------------------------------------------------------
    # MPP import helper
    # ------------------------------------------------------------------

    def import_from_mpp(self, project_name: str, tasks: List[dict]) -> tuple[Project, int]:
        """
        Create a project and bulk-insert WBS rows from parsed MPP task data.

        Args:
            project_name: Name for the new project record.
            tasks: List of task dicts from MPPReader.parse() output.

        Returns:
            (Project, wbs_count) tuple.
        """
        project = self.repo.create({"project_name": project_name})

        wbs_rows = []
        for task in tasks:
            name = task.get("name") or "Unnamed Task"
            if not name.strip():
                continue
            wbs_rows.append(
                {
                    "project_id": project.id,
                    "task_unique_id": task.get("id"),
                    "wbs_title": name[:500],
                    "schedule_start": task.get("start"),
                    "schedule_finish": task.get("finish"),
                }
            )

        if wbs_rows:
            self.wbs_repo.bulk_create(wbs_rows)

        return project, len(wbs_rows)
