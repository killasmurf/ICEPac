"""Resource service with business logic."""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.resource_repository import ResourceRepository
from app.models.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse


class ResourceService:
    def __init__(self, db: Session):
        self.repo = ResourceRepository(db)

    def get_resource(self, resource_id: int) -> ResourceResponse:
        resource = self.repo.get_by_id(resource_id)
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource {resource_id} not found")
        return ResourceResponse.from_orm(resource)

    def list_resources(self, skip: int = 0, limit: int = 100, search: Optional[str] = None,
                       eoc: Optional[str] = None, is_active: Optional[bool] = None) -> Dict[str, Any]:
        if search:
            items = self.repo.search(search, skip=skip, limit=limit, eoc=eoc, is_active=is_active)
        else:
            filters = {}
            if eoc: filters["eoc"] = eoc
            if is_active is not None: filters["is_active"] = is_active
            items = self.repo.get_all(skip=skip, limit=limit, filters=filters or None)
        total = self.repo.count(filters={"eoc": eoc, "is_active": is_active} if eoc or is_active is not None else None)
        return {"items": [ResourceResponse.from_orm(r) for r in items], "total": total, "skip": skip, "limit": limit}

    def create_resource(self, data: ResourceCreate, user_id: int) -> ResourceResponse:
        if self.repo.get_by_code(data.resource_code):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Code '{data.resource_code}' exists")
        d = data.dict()
        d["created_by"] = d["updated_by"] = user_id
        return ResourceResponse.from_orm(self.repo.create(d))

    def update_resource(self, resource_id: int, data: ResourceUpdate, user_id: int) -> ResourceResponse:
        existing = self.repo.get_by_id(resource_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource {resource_id} not found")
        if data.resource_code and data.resource_code != existing.resource_code and self.repo.get_by_code(data.resource_code):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Code '{data.resource_code}' in use")
        d = data.dict(exclude_unset=True)
        d["updated_by"] = user_id
        return ResourceResponse.from_orm(self.repo.update(resource_id, d))

    def delete_resource(self, resource_id: int) -> bool:
        if not self.repo.get_by_id(resource_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource {resource_id} not found")
        return self.repo.delete(resource_id)

    def get_eoc_summary(self) -> Dict[str, int]:
        return self.repo.count_by_eoc()
