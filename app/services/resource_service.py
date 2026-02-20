"""Resource service with business logic."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.resource import Resource
from app.models.schemas.resource import ResourceCreate, ResourceUpdate
from app.repositories.resource_repository import ResourceRepository


class ResourceService:
    """Service layer for Resource operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = ResourceRepository(db)

    def get(self, resource_id: int) -> Optional[Resource]:
        """Get a resource by ID."""
        return self.repository.get(resource_id)

    def get_or_404(self, resource_id: int) -> Resource:
        """Get a resource by ID or raise 404."""
        resource = self.repository.get(resource_id)
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource with ID {resource_id} not found",
            )
        return resource

    def get_by_code(self, resource_code: str) -> Optional[Resource]:
        """Get a resource by its unique code."""
        return self.repository.get_by_code(resource_code)

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[Resource]:
        """Get multiple resources with pagination."""
        return self.repository.get_multi(skip=skip, limit=limit)

    def get_active(self, skip: int = 0, limit: int = 100) -> List[Resource]:
        """Get active resources with pagination."""
        return self.repository.get_active(skip=skip, limit=limit)

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Resource]:
        """Search resources by code or description."""
        return self.repository.search(query, skip=skip, limit=limit)

    def count(self) -> int:
        """Count total resources."""
        return self.repository.count()

    def count_active(self) -> int:
        """Count active resources."""
        return self.repository.count_active()

    def count_search(self, query: str) -> int:
        """Count search results."""
        return self.repository.count_search(query)

    def create(self, resource_in: ResourceCreate) -> Resource:
        """Create a new resource."""
        # Check for duplicate code
        existing = self.repository.get_by_code(resource_in.resource_code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Resource with code "
                    f"'{resource_in.resource_code}' already exists"
                ),
            )

        data = resource_in.model_dump()
        return self.repository.create(data)

    def update(self, resource_id: int, resource_in: ResourceUpdate) -> Resource:
        """Update an existing resource."""
        resource = self.get_or_404(resource_id)
        update_data = resource_in.model_dump(exclude_unset=True)

        # Check for duplicate code if changing
        if (
            "resource_code" in update_data
            and update_data["resource_code"] != resource.resource_code
        ):
            existing = self.repository.get_by_code(update_data["resource_code"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Resource with code "
                        f"'{update_data['resource_code']}' already exists"
                    ),
                )

        return self.repository.update(resource, update_data)

    def delete(self, resource_id: int) -> bool:
        """Delete a resource."""
        self.get_or_404(resource_id)  # Verify exists
        return self.repository.delete(resource_id)

    def deactivate(self, resource_id: int) -> Resource:
        """Soft delete by deactivating a resource."""
        resource = self.get_or_404(resource_id)
        return self.repository.update(resource, {"is_active": False})

    def activate(self, resource_id: int) -> Resource:
        """Reactivate a deactivated resource."""
        resource = self.get_or_404(resource_id)
        return self.repository.update(resource, {"is_active": True})
