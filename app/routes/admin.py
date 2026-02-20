"""Admin circuit routes - user, resource, supplier, and config table management.

All admin routes require authentication and appropriate role permissions.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_any_role
from app.models.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.models.schemas.config import (
    CONFIG_TABLE_INFO,
    ConfigItemListResponse,
    ConfigItemResponse,
    WeightedConfigItemResponse,
)
from app.models.schemas.resource import (
    ResourceCreate,
    ResourceListResponse,
    ResourceResponse,
    ResourceUpdate,
    SupplierCreate,
    SupplierListResponse,
    SupplierResponse,
    SupplierUpdate,
)
from app.models.schemas.user import (
    UserCreate,
    UserListResponse,
    UserPasswordUpdate,
    UserResponse,
    UserUpdate,
)
from app.services.audit_service import AuditService, serialize_for_audit
from app.services.config_service import get_config_service, is_weighted_table
from app.services.resource_service import ResourceService
from app.services.supplier_service import SupplierService
from app.services.user_service import UserService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_any_role("admin", "manager"))],
)


# ============================================================
# User Management
# ============================================================


@router.get("/users", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all users with pagination."""
    service = UserService(db)
    users = service.get_multi(skip=skip, limit=limit)
    total = service.count()
    return UserListResponse(items=users, total=total, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single user by ID."""
    service = UserService(db)
    return service.get_or_404(user_id)


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new user."""
    service = UserService(db)
    user = service.create(user_in)

    audit = AuditService(db)
    audit.log_create(
        "User", user.id, serialize_for_audit(user), current_user.id, request
    )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an existing user."""
    service = UserService(db)
    old_user = service.get_or_404(user_id)
    old_values = serialize_for_audit(old_user)
    user = service.update(user_id, user_in)

    audit = AuditService(db)
    audit.log_update(
        "User", user.id, old_values, serialize_for_audit(user), current_user.id, request
    )
    return user


@router.put("/users/{user_id}/password")
async def update_password(
    user_id: int,
    password_in: UserPasswordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Change user password."""
    service = UserService(db)
    service.update_password(user_id, password_in)

    audit = AuditService(db)
    audit.log_password_change(user_id, request)
    return {"detail": "Password updated"}


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a user."""
    service = UserService(db)
    user = service.get_or_404(user_id)
    old_values = serialize_for_audit(user)
    service.delete(user_id)

    audit = AuditService(db)
    audit.log_delete("User", user_id, old_values, current_user.id, request)


# ============================================================
# Resource Library
# ============================================================


@router.get("/resources", response_model=ResourceListResponse)
async def list_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, min_length=1),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List resources with optional search and filtering."""
    service = ResourceService(db)
    if search:
        items = service.search(search, skip=skip, limit=limit)
        total = service.count_search(search)
    elif active_only:
        items = service.get_active(skip=skip, limit=limit)
        total = service.count_active()
    else:
        items = service.get_multi(skip=skip, limit=limit)
        total = service.count()
    return ResourceListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/resources/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single resource."""
    return ResourceService(db).get_or_404(resource_id)


@router.post("/resources", response_model=ResourceResponse, status_code=201)
async def create_resource(
    resource_in: ResourceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new resource."""
    service = ResourceService(db)
    resource = service.create(resource_in)

    audit = AuditService(db)
    audit.log_create(
        "Resource", resource.id, serialize_for_audit(resource), current_user.id, request
    )
    return resource


@router.put("/resources/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int,
    resource_in: ResourceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a resource."""
    service = ResourceService(db)
    old = service.get_or_404(resource_id)
    old_values = serialize_for_audit(old)
    resource = service.update(resource_id, resource_in)

    audit = AuditService(db)
    audit.log_update(
        "Resource",
        resource.id,
        old_values,
        serialize_for_audit(resource),
        current_user.id,
        request,
    )
    return resource


@router.delete("/resources/{resource_id}", status_code=204)
async def delete_resource(
    resource_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a resource."""
    service = ResourceService(db)
    resource = service.get_or_404(resource_id)
    old_values = serialize_for_audit(resource)
    service.delete(resource_id)

    audit = AuditService(db)
    audit.log_delete("Resource", resource_id, old_values, current_user.id, request)


# ============================================================
# Supplier Management
# ============================================================


@router.get("/suppliers", response_model=SupplierListResponse)
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, min_length=1),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List suppliers with optional search and filtering."""
    service = SupplierService(db)
    if search:
        items = service.search(search, skip=skip, limit=limit)
        total = service.count_search(search)
    elif active_only:
        items = service.get_active(skip=skip, limit=limit)
        total = service.count_active()
    else:
        items = service.get_multi(skip=skip, limit=limit)
        total = service.count()
    return SupplierListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single supplier."""
    return SupplierService(db).get_or_404(supplier_id)


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    supplier_in: SupplierCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new supplier."""
    service = SupplierService(db)
    supplier = service.create(supplier_in)

    audit = AuditService(db)
    audit.log_create(
        "Supplier", supplier.id, serialize_for_audit(supplier), current_user.id, request
    )
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a supplier."""
    service = SupplierService(db)
    old = service.get_or_404(supplier_id)
    old_values = serialize_for_audit(old)
    supplier = service.update(supplier_id, supplier_in)

    audit = AuditService(db)
    audit.log_update(
        "Supplier",
        supplier.id,
        old_values,
        serialize_for_audit(supplier),
        current_user.id,
        request,
    )
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a supplier."""
    service = SupplierService(db)
    supplier = service.get_or_404(supplier_id)
    old_values = serialize_for_audit(supplier)
    service.delete(supplier_id)

    audit = AuditService(db)
    audit.log_delete("Supplier", supplier_id, old_values, current_user.id, request)


# ============================================================
# Configuration Tables (Generic CRUD)
# ============================================================


@router.get("/config")
async def list_config_tables(current_user=Depends(get_current_user)):
    """List all available configuration tables."""
    return {"tables": [{"name": k, **v} for k, v in CONFIG_TABLE_INFO.items()]}


@router.get("/config/{table_name}", response_model=ConfigItemListResponse)
async def list_config_items(
    table_name: str,
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all items in a configuration table."""
    service = get_config_service(table_name, db)
    items = service.get_active() if active_only else service.get_all()
    return ConfigItemListResponse(items=items, total=len(items))


@router.get("/config/{table_name}/{item_id}")
async def get_config_item(
    table_name: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single config item."""
    service = get_config_service(table_name, db)
    item = service.get_or_404(item_id)
    if is_weighted_table(table_name):
        return WeightedConfigItemResponse.model_validate(item)
    return ConfigItemResponse.model_validate(item)


@router.post("/config/{table_name}", status_code=201)
async def create_config_item(
    table_name: str,
    request: Request,
    item_in: dict = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a config item."""
    service = get_config_service(table_name, db)
    item = service.create(item_in)

    audit = AuditService(db)
    audit.log_create(
        table_name, item.id, serialize_for_audit(item), current_user.id, request
    )

    if is_weighted_table(table_name):
        return WeightedConfigItemResponse.model_validate(item)
    return ConfigItemResponse.model_validate(item)


@router.put("/config/{table_name}/{item_id}")
async def update_config_item(
    table_name: str,
    item_id: int,
    request: Request,
    item_in: dict = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a config item."""
    service = get_config_service(table_name, db)
    old = service.get_or_404(item_id)
    old_values = serialize_for_audit(old)
    item = service.update(item_id, item_in)

    audit = AuditService(db)
    audit.log_update(
        table_name,
        item.id,
        old_values,
        serialize_for_audit(item),
        current_user.id,
        request,
    )

    if is_weighted_table(table_name):
        return WeightedConfigItemResponse.model_validate(item)
    return ConfigItemResponse.model_validate(item)


@router.delete("/config/{table_name}/{item_id}", status_code=204)
async def delete_config_item(
    table_name: str,
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a config item."""
    service = get_config_service(table_name, db)
    item = service.get_or_404(item_id)
    old_values = serialize_for_audit(item)
    service.delete(item_id)

    audit = AuditService(db)
    audit.log_delete(table_name, item_id, old_values, current_user.id, request)


# ============================================================
# Audit Logs
# ============================================================


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_any_role("admin")),
):
    """List audit logs with filtering (admin only)."""
    service = AuditService(db)
    logs = service.get_logs(
        user_id, action, entity_type, entity_id, start_date, end_date, skip, limit
    )
    total = service.count_logs(
        user_id, action, entity_type, entity_id, start_date, end_date
    )

    items = [
        AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            username=log.user.username if log.user else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at,
        )
        for log in logs
    ]
    return AuditLogListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/audit-logs/{audit_id}", response_model=AuditLogResponse)
async def get_audit_log(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_any_role("admin")),
):
    """Get a single audit log entry (admin only)."""
    service = AuditService(db)
    log = service.get(audit_id)
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return AuditLogResponse(
        id=log.id,
        user_id=log.user_id,
        username=log.user.username if log.user else None,
        action=log.action,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        old_values=log.old_values,
        new_values=log.new_values,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        created_at=log.created_at,
    )
