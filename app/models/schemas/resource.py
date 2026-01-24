"""Resource and Supplier schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from decimal import Decimal


# --- Resource schemas ---

class ResourceBase(BaseModel):
    resource_code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=500)
    eoc: Optional[str] = None
    cost: Decimal = Decimal("0")
    units: Optional[str] = None


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    resource_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    eoc: Optional[str] = None
    cost: Optional[Decimal] = None
    units: Optional[str] = None


class ResourceResponse(ResourceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResourceListResponse(BaseModel):
    items: list[ResourceResponse]
    total: int
    skip: int
    limit: int


# --- Supplier schemas ---

class SupplierBase(BaseModel):
    supplier_code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SupplierListResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int
