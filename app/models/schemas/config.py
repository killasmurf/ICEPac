"""Configuration table schemas for generic CRUD operations."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ============================================================
# Standard Config Item Schemas (code + description)
# ============================================================

class ConfigItemBase(BaseModel):
    """Base schema for simple configuration items."""
    code: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=255)


class ConfigItemCreate(ConfigItemBase):
    """Schema for creating a config item."""
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Ensure code is uppercase."""
        return v.upper().strip()


class ConfigItemUpdate(BaseModel):
    """Schema for updating a config item (all fields optional)."""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: Optional[str]) -> Optional[str]:
        """Ensure code is uppercase if provided."""
        if v is not None:
            return v.upper().strip()
        return v


class ConfigItemResponse(ConfigItemBase):
    """Schema for config item API response."""
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConfigItemListResponse(BaseModel):
    """List of configuration items."""
    items: list[ConfigItemResponse]
    total: int


# ============================================================
# Weighted Config Item Schemas (code + description + weight)
# ============================================================

class WeightedConfigItemBase(BaseModel):
    """Base schema for weighted configuration items (probability, severity, etc.)."""
    code: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=255)
    weight: Decimal = Field(..., ge=0, le=100)


class WeightedConfigItemCreate(WeightedConfigItemBase):
    """Schema for creating a weighted config item."""
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Ensure code is uppercase."""
        return v.upper().strip()


class WeightedConfigItemUpdate(BaseModel):
    """Schema for updating a weighted config item (all fields optional)."""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    weight: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: Optional[str]) -> Optional[str]:
        """Ensure code is uppercase if provided."""
        if v is not None:
            return v.upper().strip()
        return v


class WeightedConfigItemResponse(WeightedConfigItemBase):
    """Schema for weighted config item API response."""
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WeightedConfigItemListResponse(BaseModel):
    """List of weighted configuration items."""
    items: list[WeightedConfigItemResponse]
    total: int


# ============================================================
# Config Table Metadata
# ============================================================

CONFIG_TABLE_INFO = {
    "cost-types": {
        "name": "Cost Types",
        "description": "Cost type classifications for resource assignments",
        "weighted": False,
    },
    "expense-types": {
        "name": "Expense Types",
        "description": "Expense type classifications",
        "weighted": False,
    },
    "regions": {
        "name": "Regions",
        "description": "Geographic regions for projects and resources",
        "weighted": False,
    },
    "business-areas": {
        "name": "Business Areas",
        "description": "Business area classifications",
        "weighted": False,
    },
    "estimating-techniques": {
        "name": "Estimating Techniques",
        "description": "Estimation methodology classifications",
        "weighted": False,
    },
    "risk-categories": {
        "name": "Risk Categories",
        "description": "Risk classification categories",
        "weighted": False,
    },
    "expenditure-indicators": {
        "name": "Expenditure Indicators",
        "description": "Expenditure indicator classifications",
        "weighted": False,
    },
    "probability-levels": {
        "name": "Probability Levels",
        "description": "Risk probability levels with weights",
        "weighted": True,
    },
    "severity-levels": {
        "name": "Severity Levels",
        "description": "Risk severity levels with weights",
        "weighted": True,
    },
    "pmb-weights": {
        "name": "PMB Weights",
        "description": "Project Management Baseline weights",
        "weighted": True,
    },
}
