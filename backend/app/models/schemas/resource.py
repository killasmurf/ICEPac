"""Resource and Supplier Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator


class ResourceBase(BaseModel):
    resource_code: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=500)
    eoc: Optional[str] = Field(None, max_length=50)
    cost: float = Field(0.0, ge=0)
    units: Optional[str] = Field(None, max_length=50)
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

class ResourceCreate(ResourceBase):
    @validator("resource_code")
    def validate_code(cls, v):
        return v.strip().upper()

class ResourceUpdate(BaseModel):
    resource_code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    eoc: Optional[str] = Field(None, max_length=50)
    cost: Optional[float] = Field(None, ge=0)
    units: Optional[str] = Field(None, max_length=50)
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ResourceResponse(ResourceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    class Config:
        from_attributes = True

class ResourceListResponse(BaseModel):
    items: List[ResourceResponse]
    total: int
    skip: int
    limit: int


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    website: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    @validator("email")
    def validate_email(cls, v):
        if v and "@" not in v:
            raise ValueError("Invalid email address")
        return v

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    website: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    class Config:
        from_attributes = True

class SupplierListResponse(BaseModel):
    items: List[SupplierResponse]
    total: int
    skip: int
    limit: int
