"""Help system schemas."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# --- HelpDescription schemas ---

class HelpDescriptionResponse(BaseModel):
    id: int
    topic_id: int
    section_number: int
    detailed_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- HelpCategory schemas ---

class HelpCategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    display_order: int = 0
    is_active: bool = True


class HelpCategoryCreate(HelpCategoryBase):
    pass


class HelpCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class HelpCategoryResponse(HelpCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- HelpTopic schemas ---

class HelpTopicBase(BaseModel):
    category_id: int
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(min_length=1)
    display_order: int = 0
    is_active: bool = True


class HelpTopicCreate(HelpTopicBase):
    pass


class HelpTopicUpdate(BaseModel):
    category_id: Optional[int] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    content: Optional[str] = Field(default=None, min_length=1)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class HelpTopicResponse(HelpTopicBase):
    id: int
    created_at: datetime
    updated_at: datetime
    descriptions: List[HelpDescriptionResponse] = []

    model_config = {"from_attributes": True}


class HelpTopicListResponse(BaseModel):
    items: List[HelpTopicResponse]
    total: int
    skip: int
    limit: int


class HelpSearchResult(BaseModel):
    id: int
    title: str
    content: str
    category_id: int
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}
