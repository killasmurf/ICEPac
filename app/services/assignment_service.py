"""Resource Assignment service."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.database.assignment import ResourceAssignment
from app.models.database.resource import Resource
from app.models.database.wbs import WBS
from app.models.schemas.assignment import AssignmentCreate, AssignmentUpdate
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.wbs_repository import WBSRepository


class AssignmentService:
    """Service for managing resource assignments."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = AssignmentRepository(db)
        self.wbs_repo = WBSRepository(db)

    def get(self, assignment_id: int) -> Optional[ResourceAssignment]:
        """Get an assignment by ID."""
        return self.repository.get(assignment_id)

    def get_or_404(self, assignment_id: int) -> ResourceAssignment:
        """Get an assignment by ID or raise 404."""
        assignment = self.repository.get(assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )
        return assignment

    def get_by_wbs(self, wbs_id: int) -> List[ResourceAssignment]:
        """Get all assignments for a WBS item."""
        return self.repository.get_by_wbs(wbs_id)

    def count_by_wbs(self, wbs_id: int) -> int:
        """Count assignments for a WBS item."""
        return self.repository.count_by_wbs(wbs_id)

    def create(self, wbs_id: int, data: AssignmentCreate) -> ResourceAssignment:
        """Create a new assignment for a WBS item.

        Validates:
        - WBS item exists
        - WBS item is editable (not submitted/approved)
        - Resource code exists in resources table
        """
        # Validate WBS exists and is editable
        self._validate_wbs_editable(wbs_id)

        # Validate resource exists
        self._validate_resource_code(data.resource_code)

        # Create assignment
        assignment_data = data.model_dump()
        assignment_data["wbs_id"] = wbs_id
        return self.repository.create(assignment_data)

    def update(self, assignment_id: int, data: AssignmentUpdate) -> ResourceAssignment:
        """Update an assignment.

        Validates:
        - Assignment exists
        - WBS item is editable (not submitted/approved)
        - If resource_code changing, new code exists
        """
        assignment = self.get_or_404(assignment_id)

        # Validate WBS is editable
        self._validate_wbs_editable(assignment.wbs_id)

        # Validate resource if being changed
        update_data = data.model_dump(exclude_unset=True)
        if "resource_code" in update_data and update_data["resource_code"]:
            self._validate_resource_code(update_data["resource_code"])

        return self.repository.update(assignment, update_data)

    def delete(self, assignment_id: int) -> bool:
        """Delete an assignment.

        Validates WBS is editable before allowing delete.
        """
        assignment = self.get_or_404(assignment_id)

        # Validate WBS is editable
        self._validate_wbs_editable(assignment.wbs_id)

        return self.repository.delete(assignment_id)

    def _validate_wbs_editable(self, wbs_id: int) -> WBS:
        """Validate that a WBS item exists and is editable.

        Raises:
            HTTPException 404 if WBS not found
            HTTPException 409 if WBS is submitted or approved
        """
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS item not found",
            )

        if wbs.approval_status in ("submitted", "approved"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot modify assignment: WBS item is {wbs.approval_status}",
            )

        return wbs

    def _validate_resource_code(self, resource_code: str) -> None:
        """Validate that a resource code exists.

        Raises:
            HTTPException 400 if resource not found
        """
        stmt = select(Resource).where(Resource.resource_code == resource_code)
        resource = self.db.scalars(stmt).first()
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Resource '{resource_code}' not found",
            )
