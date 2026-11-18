"""Authentication routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.schemas.auth import TokenRefreshRequest, TokenResponse
from app.models.schemas.user import UserResponse
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth")
logger = logging.getLogger(__name__)


def _audit_login(db: Session, write, *args) -> None:
    """Record a login event without ever failing the login itself."""
    try:
        write(*args)
    except Exception:  # noqa: BLE001 - auditing is best effort here
        db.rollback()
        logger.warning("Could not write login audit row", exc_info=True)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT tokens."""
    service = UserService(db)
    user = service.authenticate(form_data.username, form_data.password)
    audit = AuditService(db)
    if not user:
        # Only the attempted username is recorded, never the password.
        _audit_login(db, audit.log_failed_login, form_data.username, request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _audit_login(db, audit.log_login, user.id, request)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    """Refresh access token using a valid refresh token."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    service = UserService(db)
    user = service.get(int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user=Depends(get_current_user)):
    """Return the currently authenticated user (never the password hash)."""
    return current_user
