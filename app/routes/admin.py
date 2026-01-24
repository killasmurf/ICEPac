"""Admin circuit routes - user, resource, supplier, and config table management."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_any_role
from app.models.schemas.user import (
    UserCreate, UserUpdate, UserPasswordUpdate, UserResponse, UserListResponse,
)
from app.models.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceResponse, ResourceListResponse,
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse,
)
from app.models.schemas.config import (
    ConfigItemCreate, ConfigItemUpdate, ConfigItemResponse, ConfigItemListResponse,
    WeightedConfigItemCreate, WeightedConfigItemUpdate,
    WeightedConfigItemResponse, WeightedConfigItemListResponse,
)
from app.services.user_service import UserService
from app.services.resource_service import ResourceService, SupplierService
from app.services.config_service import ConfigService
from app.models.database.config_tables import (
    CostType, ExpenseType, Region, BusinessArea,
    EstimatingTechnique, RiskCategory, ProbabilityLevel,
    SeverityLevel, ExpenditureIndicator, PMBWeight,
)

router = APIRouter(
    prefix="/admin",
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new user."""
    service = UserService(db)
    return service.create(user_in)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an existing user."""
    service = UserService(db)
    return service.update(user_id, user_in)


@router.put("/users/{user_id}/password")
async def update_password(
    user_id: int,
    password_in: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Change user password."""
    service = UserService(db)
    service.update_password(user_id, password_in)
    return {"detail": "Password updated"}


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a user."""
    service = UserService(db)
    service.delete(user_id)


# ============================================================
# Resource Library
# ============================================================


@router.get("/resources", response_model=ResourceListResponse)
async def list_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List resources with optional search."""
    service = ResourceService(db)
    if search:
        items = service.search(search, skip=skip, limit=limit)
        total = len(items)
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
    service = ResourceService(db)
    return service.get_or_404(resource_id)


@router.post("/resources", response_model=ResourceResponse, status_code=201)
async def create_resource(
    resource_in: ResourceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new resource."""
    service = ResourceService(db)
    return service.create(resource_in)


@router.put("/resources/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int,
    resource_in: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a resource."""
    service = ResourceService(db)
    return service.update(resource_id, resource_in)


@router.delete("/resources/{resource_id}", status_code=204)
async def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a resource."""
    service = ResourceService(db)
    service.delete(resource_id)


# ============================================================
# Supplier Management
# ============================================================


@router.get("/suppliers", response_model=SupplierListResponse)
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List suppliers with optional search."""
    service = SupplierService(db)
    if search:
        items = service.search(search, skip=skip, limit=limit)
        total = len(items)
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
    service = SupplierService(db)
    return service.get_or_404(supplier_id)


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new supplier."""
    service = SupplierService(db)
    return service.create(supplier_in)


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a supplier."""
    service = SupplierService(db)
    return service.update(supplier_id, supplier_in)


@router.delete("/suppliers/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a supplier."""
    service = SupplierService(db)
    service.delete(supplier_id)


# ============================================================
# Configuration Tables (generic CRUD for lookup tables)
# ============================================================

CONFIG_TABLES = {
    "cost-types": CostType,
    "expense-types": ExpenseType,
    "regions": Region,
    "business-areas": BusinessArea,
    "estimating-techniques": EstimatingTechnique,
    "risk-categories": RiskCategory,
    "expenditure-indicators": ExpenditureIndicator,
}

WEIGHTED_CONFIG_TABLES = {
    "probability-levels": ProbabilityLevel,
    "severity-levels": SeverityLevel,
    "pmb-weights": PMBWeight,
}


@router.get("/config/{table_name}", response_model=ConfigItemListResponse)
async def list_config_items(
    table_name: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all items in a configuration table."""
    model = _resolve_config_table(table_name)
    service = ConfigService(model, db)
    items = service.get_all()
    return ConfigItemListResponse(items=items, total=len(items))


@router.post("/config/{table_name}", response_model=ConfigItemResponse, status_code=201)
async def create_config_item(
    table_name: str,
    item_in: ConfigItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a config item."""
    model = _resolve_config_table(table_name)
    service = ConfigService(model, db)
    return service.create(item_in.model_dump())


@router.put("/config/{table_name}/{item_id}", response_model=ConfigItemResponse)
async def update_config_item(
    table_name: str,
    item_id: int,
    item_in: ConfigItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a config item."""
    model = _resolve_config_table(table_name)
    service = ConfigService(model, db)
    return service.update(item_id, item_in.model_dump(exclude_unset=True))


@router.delete("/config/{table_name}/{item_id}", status_code=204)
async def delete_config_item(
    table_name: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a config item."""
    model = _resolve_config_table(table_name)
    service = ConfigService(model, db)
    service.delete(item_id)


def _resolve_config_table(table_name: str):
    """Resolve table name to SQLAlchemy model."""
    from fastapi import HTTPException, status as http_status

    all_tables = {**CONFIG_TABLES, **WEIGHTED_CONFIG_TABLES}
    model = all_tables.get(table_name)
    if not model:
        valid = ", ".join(sorted(all_tables.keys()))
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Unknown config table '{table_name}'. Valid tables: {valid}",
        )
    return model
