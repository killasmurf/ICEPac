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

    def list_filtered(
        self,
        search: Optional[str] = None,
        active_only: bool = False,
        supplier_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Resource]:
        """List resources matching every given filter."""
        items = self.repository.list_filtered(
            search, active_only, supplier_code, skip=skip, limit=limit
        )
        return self.attach_supplier_names(items)

    def count_filtered(
        self,
        search: Optional[str] = None,
        active_only: bool = False,
        supplier_code: Optional[str] = None,
    ) -> int:
        return self.repository.count_filtered(search, active_only, supplier_code)

    def attach_supplier_names(self, resources):
        """Set ``supplier_name`` on each resource using a single query."""
        if isinstance(resources, Resource):
            self.attach_supplier_names([resources])
            return resources
        names = self.repository.supplier_names(r.supplier_code for r in resources)
        for r in resources:
            r.supplier_name = names.get(r.supplier_code)
        return resources

    def _check_supplier(self, supplier_code: Optional[str]) -> None:
        if supplier_code and not self.repository.supplier_exists(supplier_code):
            raise HTTPException(
                status_code=422,
                detail=f"Supplier '{supplier_code}' does not exist",
            )

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

        self._check_supplier(resource_in.supplier_code)
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

        self._check_supplier(update_data.get("supplier_code"))
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
