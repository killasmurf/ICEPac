"""Configuration table schemas (generic code/description pattern)."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from decimal import Decimal


class ConfigItemBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=255)


class ConfigItemCreate(ConfigItemBase):
    pass


class ConfigItemUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)


class ConfigItemResponse(ConfigItemBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ConfigItemListResponse(BaseModel):
    items: list[ConfigItemResponse]
    total: int


# Weighted config items (probability, severity, PMB)

class WeightedConfigItemBase(ConfigItemBase):
    weight: Decimal = Decimal("0")


class WeightedConfigItemCreate(WeightedConfigItemBase):
    pass


class WeightedConfigItemUpdate(ConfigItemUpdate):
    weight: Optional[Decimal] = None


class WeightedConfigItemResponse(WeightedConfigItemBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WeightedConfigItemListResponse(BaseModel):
    items: list[WeightedConfigItemResponse]
    total: int
