"""Resource and Supplier schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

# ============================================================
# Resource Schemas
# ============================================================


class ResourceBase(BaseModel):
    """Base resource schema."""

    resource_code: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=500)
    eoc: Optional[str] = Field(None, max_length=50)  # Element of Cost
    cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    units: Optional[str] = Field(None, max_length=50)


class ResourceCreate(ResourceBase):
    """Schema for creating a resource."""

    is_active: bool = True

    @field_validator("resource_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Ensure resource code is uppercase."""
        return v.upper().strip()


class ResourceUpdate(BaseModel):
    """Schema for updating a resource (all fields optional)."""

    resource_code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    eoc: Optional[str] = Field(None, max_length=50)
    cost: Optional[Decimal] = Field(None, ge=0)
    units: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

    @field_validator("resource_code")
    @classmethod
    def uppercase_code(cls, v: Optional[str]) -> Optional[str]:
        """Ensure resource code is uppercase if provided."""
        if v is not None:
            return v.upper().strip()
        return v


class ResourceResponse(ResourceBase):
    """Schema for resource API response."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResourceListResponse(BaseModel):
    """Paginated list of resources."""

    items: list[ResourceResponse]
    total: int
    skip: int
    limit: int


# ============================================================
# Supplier Schemas
# ============================================================


class SupplierBase(BaseModel):
    """Base supplier schema."""

    supplier_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    contact: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier."""

    is_active: bool = True

    @field_validator("supplier_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Ensure supplier code is uppercase."""
        return v.upper().strip()


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier (all fields optional)."""

    supplier_code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("supplier_code")
    @classmethod
    def uppercase_code(cls, v: Optional[str]) -> Optional[str]:
        """Ensure supplier code is uppercase if provided."""
        if v is not None:
            return v.upper().strip()
        return v


class SupplierResponse(SupplierBase):
    """Schema for supplier API response."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SupplierListResponse(BaseModel):
    """Paginated list of suppliers."""

    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int
