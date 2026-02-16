"""Approval workflow service."""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.audit_log import AuditLog
from app.models.database.wbs import WBS
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.wbs_repository import WBSRepository


class ApprovalService:
    """Service for managing WBS approval workflow.

    State machine:
    - draft -> submitted (via submit_for_approval)
    - submitted -> approved (via approve)
    - submitted -> rejected (via reject)
    - rejected -> draft (via reset_to_draft)
    """

    # Valid state transitions
    VALID_TRANSITIONS = {
        "draft": ["submitted"],
        "submitted": ["approved", "rejected"],
        "rejected": ["draft"],
        "approved": [],  # Cannot change once approved
    }

    def __init__(self, db: Session):
        self.db = db
        self.wbs_repo = WBSRepository(db)
        self.assignment_repo = AssignmentRepository(db)

    def get_approval_status(self, wbs_id: int) -> WBS:
        """Get the current approval status of a WBS item."""
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS item not found",
            )
        return wbs

    def submit_for_approval(self, wbs_id: int, user_id: int, username: str) -> WBS:
        """Submit a WBS item for approval.

        Transition: draft -> submitted

        Validates:
        - WBS exists
        - Current status is draft
        - WBS has at least one assignment
        """
        wbs = self._validate_transition(wbs_id, "submitted")

        # Validate has assignments
        assignment_count = self.assignment_repo.count_by_wbs(wbs_id)
        if assignment_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit for approval: WBS has no assignments",
            )

        # Update status
        wbs.approval_status = "submitted"
        self.db.commit()
        self.db.refresh(wbs)

        # Log audit
        self._log_audit(
            user_id=user_id,
            username=username,
            action="SUBMIT",
            wbs=wbs,
            comment=None,
        )

        return wbs

    def approve(self, wbs_id: int, user_id: int, username: str) -> WBS:
        """Approve a WBS item.

        Transition: submitted -> approved

        Sets approver, approver_date, and increments estimate_revision.
        """
        wbs = self._validate_transition(wbs_id, "approved")

        # Update status and approval fields
        wbs.approval_status = "approved"
        wbs.approver = username
        wbs.approver_date = datetime.utcnow()
        wbs.estimate_revision = (wbs.estimate_revision or 0) + 1
        self.db.commit()
        self.db.refresh(wbs)

        # Log audit
        self._log_audit(
            user_id=user_id,
            username=username,
            action="APPROVE",
            wbs=wbs,
            comment=None,
        )

        return wbs

    def reject(
        self,
        wbs_id: int,
        user_id: int,
        username: str,
        comment: Optional[str] = None,
    ) -> WBS:
        """Reject a WBS item.

        Transition: submitted -> rejected
        """
        wbs = self._validate_transition(wbs_id, "rejected")

        # Update status
        wbs.approval_status = "rejected"
        self.db.commit()
        self.db.refresh(wbs)

        # Log audit with comment
        self._log_audit(
            user_id=user_id,
            username=username,
            action="REJECT",
            wbs=wbs,
            comment=comment,
        )

        return wbs

    def reset_to_draft(self, wbs_id: int, user_id: int, username: str) -> WBS:
        """Reset a rejected WBS item to draft for re-editing.

        Transition: rejected -> draft
        """
        wbs = self._validate_transition(wbs_id, "draft")

        # Update status
        wbs.approval_status = "draft"
        self.db.commit()
        self.db.refresh(wbs)

        # Log audit
        self._log_audit(
            user_id=user_id,
            username=username,
            action="RESET",
            wbs=wbs,
            comment=None,
        )

        return wbs

    def _validate_transition(self, wbs_id: int, target_status: str) -> WBS:
        """Validate that a state transition is allowed.

        Raises:
            HTTPException 404 if WBS not found
            HTTPException 409 if transition not allowed
        """
        wbs = self.wbs_repo.get(wbs_id)
        if not wbs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WBS item not found",
            )

        current_status = wbs.approval_status or "draft"
        allowed = self.VALID_TRANSITIONS.get(current_status, [])

        if target_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot transition from "
                f"'{current_status}' to '{target_status}'",
            )

        return wbs

    def _log_audit(
        self,
        user_id: int,
        username: str,
        action: str,
        wbs: WBS,
        comment: Optional[str],
    ) -> None:
        """Log an approval action to the audit log."""
        details = {
            "wbs_code": wbs.wbs_code,
            "wbs_title": wbs.wbs_title,
            "approval_status": wbs.approval_status,
            "estimate_revision": wbs.estimate_revision,
        }
        if comment:
            details["comment"] = comment

        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type="WBS",
            entity_id=wbs.id,
            new_values=details,
        )
        self.db.add(audit)
        self.db.commit()
