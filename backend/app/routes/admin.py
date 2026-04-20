"""Admin circuit routes - user, resource, supplier, config table, and audit log management.

All admin routes require authentication and appropriate role permissions.
Migrates the legacy Admin circuit (86 CFM files) to modern REST API.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_any_role
from app.models.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceResponse, ResourceListResponse,
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse,
)
from app.models.schemas.config import (
    ConfigItemCreate, ConfigItemUpdate, ConfigItemResponse, ConfigItemListResponse,
    WeightedConfigItemCreate, WeightedConfigItemUpdate,
    WeightedConfigItemResponse, WeightedConfigItemListResponse,
    CONFIG_TABLE_INFO,
)
from app.models.schemas.audit_log import AuditLogResponse, AuditLogListResponse
from app.services.resource_service import ResourceService
from app.services.supplier_service import SupplierService
from app.services.config_service import get_config_service, is_weighted_table
from app.services.audit_service import AuditService, serialize_for_audit

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_any_role("admin", "manager"))],
)


# ════════════════════════════════════════════════════════════════
# Dashboard
# ════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def admin_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Admin dashboard summary stats."""
    resource_svc = ResourceService(db)
    supplier_svc = SupplierService(db)
    audit_svc = AuditService(db)
    resources = resource_svc.list_resources(limit=1)
    suppliers = supplier_svc.list_suppliers(limit=1)
    recent_logs = audit_svc.get_logs(limit=10)
    return {
        "stats": {
            "total_resources": resources["total"],
            "total_suppliers": suppliers["total"],
            "recent_activity_count": recent_logs["total"],
        },
        "recent_activity": [AuditLogResponse.from_orm(log) for log in recent_logs["items"]],
    }


# ════════════════════════════════════════════════════════════════
# User Management
# ════════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
                     search: Optional[str] = None, role: Optional[str] = None,
                     is_active: Optional[bool] = None, db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    from app.services.user_service import UserService
    return UserService(db).list_users(skip=skip, limit=limit, search=search, role=role, is_active=is_active)


@router.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.services.user_service import UserService
    return UserService(db).get_user(user_id)


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(user_data: dict, request: Request, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    from app.services.user_service import UserService
    user = UserService(db).create_user(user_data, current_user.id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="create",
                         entity_type="user", entity_id=user.id if hasattr(user, "id") else None,
                         details=f"Created user: {user_data.get('username', 'unknown')}",
                         ip_address=request.client.host if request.client else None)
    return user


@router.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict, request: Request, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    from app.services.user_service import UserService
    svc = UserService(db)
    old_user = svc.get_user(user_id)
    old_values = serialize_for_audit(old_user)
    user = svc.update_user(user_id, user_data, current_user.id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="update",
                         entity_type="user", entity_id=user_id, details=f"Updated user: {user_id}",
                         old_values=old_values, new_values=serialize_for_audit(user),
                         ip_address=request.client.host if request.client else None)
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, request: Request, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    from app.services.user_service import UserService
    svc = UserService(db)
    old_user = svc.get_user(user_id)
    svc.delete_user(user_id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="delete",
                         entity_type="user", entity_id=user_id, details=f"Deleted user: {user_id}",
                         old_values=serialize_for_audit(old_user),
                         ip_address=request.client.host if request.client else None)
    return {"message": f"User {user_id} deleted"}


@router.put("/users/{user_id}/password")
async def change_password(user_id: int, password_data: dict, request: Request,
                          db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.services.user_service import UserService
    UserService(db).change_password(user_id, password_data.get("new_password", ""))
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="update",
                         entity_type="user", entity_id=user_id, details="Password changed",
                         ip_address=request.client.host if request.client else None)
    return {"message": "Password updated"}


# ════════════════════════════════════════════════════════════════
# Resource Management
# ════════════════════════════════════════════════════════════════

@router.get("/resources", response_model=ResourceListResponse)
async def list_resources(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
                         search: Optional[str] = None, eoc: Optional[str] = None,
                         is_active: Optional[bool] = None, db: Session = Depends(get_db),
                         current_user=Depends(get_current_user)):
    return ResourceService(db).list_resources(skip=skip, limit=limit, search=search, eoc=eoc, is_active=is_active)


@router.get("/resources/eoc-summary")
async def resource_eoc_summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return ResourceService(db).get_eoc_summary()


@router.get("/resources/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return ResourceService(db).get_resource(resource_id)


@router.post("/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(data: ResourceCreate, request: Request, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    resource = ResourceService(db).create_resource(data, current_user.id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="create",
                         entity_type="resource", entity_id=resource.id,
                         details=f"Created resource: {data.resource_code}",
                         new_values=serialize_for_audit(resource),
                         ip_address=request.client.host if request.client else None)
    return resource


@router.put("/resources/{resource_id}", response_model=ResourceResponse)
async def update_resource(resource_id: int, data: ResourceUpdate, request: Request,
                          db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = ResourceService(db)
    old_values = serialize_for_audit(svc.get_resource(resource_id))
    resource = svc.update_resource(resource_id, data, current_user.id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="update",
                         entity_type="resource", entity_id=resource_id,
                         old_values=old_values, new_values=serialize_for_audit(resource),
                         ip_address=request.client.host if request.client else None)
    return resource


@router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: int, request: Request, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    svc = ResourceService(db)
    old_values = serialize_for_audit(svc.get_resource(resource_id))
    svc.delete_resource(resource_id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="delete",
                         entity_type="resource", entity_id=resource_id, old_values=old_values,
                         ip_address=request.client.host if request.client else None)
    return {"message": f"Resource {resource_id} deleted"}


# ════════════════════════════════════════════════════════════════
# Supplier Management
# ════════════════════════════════════════════════════════════════

@router.get("/suppliers", response_model=SupplierListResponse)
async def list_suppliers(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
                         search: Optional[str] = None, is_active: Optional[bool] = None,
                         db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return SupplierService(db).list_suppliers(skip=skip, limit=limit, search=search, is_active=is_active)


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(supplier_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return SupplierService(db).get_supplier(supplier_id)


@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(data: SupplierCreate, request: Request, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    supplier = SupplierService(db).create_supplier(data, current_user.id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="create",
                         entity_type="supplier", entity_id=supplier.id,
                         details=f"Created supplier: {data.name}",
                         new_values=serialize_for_audit(supplier),
                         ip_address=request.client.host if request.client else None)
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(supplier_id: int, data: SupplierUpdate, request: Request,
                          db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = SupplierService(db)
    old_values = serialize_for_audit(svc.get_supplier(supplier_id))
    supplier = svc.update_supplier(supplier_id, data, current_user.id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="update",
                         entity_type="supplier", entity_id=supplier_id,
                         old_values=old_values, new_values=serialize_for_audit(supplier),
                         ip_address=request.client.host if request.client else None)
    return supplier


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: int, request: Request, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    svc = SupplierService(db)
    old_values = serialize_for_audit(svc.get_supplier(supplier_id))
    svc.delete_supplier(supplier_id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="delete",
                         entity_type="supplier", entity_id=supplier_id, old_values=old_values,
                         ip_address=request.client.host if request.client else None)
    return {"message": f"Supplier {supplier_id} deleted"}


# ════════════════════════════════════════════════════════════════
# Configuration Tables (Dynamic CRUD)
# ════════════════════════════════════════════════════════════════

@router.get("/config")
async def list_config_tables(current_user=Depends(get_current_user)):
    from app.services.config_service import ConfigService
    return ConfigService.list_tables()


@router.get("/config/{table_name}")
async def list_config_items(table_name: str, skip: int = Query(0, ge=0),
                            limit: int = Query(100, ge=1, le=500),
                            is_active: Optional[bool] = None, db: Session = Depends(get_db),
                            current_user=Depends(get_current_user)):
    return get_config_service(table_name, db).list_items(skip=skip, limit=limit, is_active=is_active)


@router.get("/config/{table_name}/{item_id}")
async def get_config_item(table_name: str, item_id: int, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    return get_config_service(table_name, db).get_item(item_id)


@router.post("/config/{table_name}", status_code=status.HTTP_201_CREATED)
async def create_config_item(table_name: str, data: dict, request: Request,
                             db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = get_config_service(table_name, db).create_item(data)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="create",
                         entity_type=table_name, entity_id=item.id if hasattr(item, "id") else None,
                         details=f"Created {table_name} item: {data.get('name', 'unknown')}",
                         new_values=data, ip_address=request.client.host if request.client else None)
    return item


@router.put("/config/{table_name}/{item_id}")
async def update_config_item(table_name: str, item_id: int, data: dict, request: Request,
                             db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = get_config_service(table_name, db)
    old_values = serialize_for_audit(svc.get_item(item_id))
    item = svc.update_item(item_id, data)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="update",
                         entity_type=table_name, entity_id=item_id,
                         old_values=old_values, new_values=data,
                         ip_address=request.client.host if request.client else None)
    return item


@router.delete("/config/{table_name}/{item_id}")
async def delete_config_item(table_name: str, item_id: int, request: Request,
                             db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    svc = get_config_service(table_name, db)
    old_values = serialize_for_audit(svc.get_item(item_id))
    svc.delete_item(item_id)
    AuditService(db).log(user_id=current_user.id, username=current_user.username, action="delete",
                         entity_type=table_name, entity_id=item_id, old_values=old_values,
                         ip_address=request.client.host if request.client else None)
    return {"message": f"Item {item_id} deleted from {table_name}"}


# ════════════════════════════════════════════════════════════════
# Audit Logs
# ════════════════════════════════════════════════════════════════

@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
                          action: Optional[str] = None, entity_type: Optional[str] = None,
                          user_id: Optional[int] = None, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    return AuditService(db).get_logs(skip=skip, limit=limit, action=action,
                                     entity_type=entity_type, user_id=user_id)


@router.get("/audit-logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(log_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return AuditService(db).get_log(log_id)
