"""Configuration table Pydantic schemas."""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class ConfigItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    code: Optional[str] = Field(None, max_length=20)
    sort_order: int = Field(0, ge=0)

class ConfigItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    code: Optional[str] = Field(None, max_length=20)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ConfigItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    code: Optional[str] = None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ConfigItemListResponse(BaseModel):
    items: List[ConfigItemResponse]
    total: int
    table_name: str

class WeightedConfigItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    weight: float = Field(0.0, ge=0.0, le=1.0)
    sort_order: int = Field(0, ge=0)
    level: Optional[int] = Field(None, ge=1)
    category: Optional[str] = Field(None, max_length=50)

class WeightedConfigItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    level: Optional[int] = Field(None, ge=1)
    category: Optional[str] = Field(None, max_length=50)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class WeightedConfigItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    weight: float
    is_active: bool
    sort_order: int
    level: Optional[int] = None
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class WeightedConfigItemListResponse(BaseModel):
    items: List[WeightedConfigItemResponse]
    total: int
    table_name: str

CONFIG_TABLE_INFO: Dict[str, dict] = {
    "cost_types": {"label": "Cost Types", "description": "Element of Cost classifications", "weighted": False},
    "expense_types": {"label": "Expense Types", "description": "Expense type categories", "weighted": False},
    "regions": {"label": "Regions", "description": "Geographic regions", "weighted": False},
    "business_areas": {"label": "Business Areas", "description": "Business area classifications", "weighted": False},
    "estimating_techniques": {"label": "Estimating Techniques", "description": "Available estimation methods", "weighted": False},
    "risk_categories": {"label": "Risk Categories", "description": "Risk classification categories", "weighted": False},
    "expenditure_indicators": {"label": "Expenditure Indicators", "description": "Expenditure indicator types", "weighted": False},
    "probability_levels": {"label": "Probability Levels", "description": "Probability of occurrence with weights", "weighted": True},
    "severity_levels": {"label": "Severity Levels", "description": "Severity of occurrence with weights", "weighted": True},
    "pmb_weights": {"label": "PMB Weights", "description": "Performance measurement baseline weights", "weighted": True},
}
