"""Help system routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.schemas.help import (
    HelpCategoryCreate, HelpCategoryUpdate, HelpCategoryResponse,
    HelpTopicCreate, HelpTopicUpdate, HelpTopicResponse, HelpTopicListResponse,
    HelpSearchResult,
)
from app.services.help_service import HelpService

router = APIRouter(prefix="/help")


# --- Public endpoints (no auth required) ---

@router.get("/topics", response_model=HelpTopicListResponse)
async def list_topics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """List all active help topics with pagination."""
    service = HelpService(db)
    topics = service.get_topics(skip=skip, limit=limit)
    total = service.count_topics()
    return HelpTopicListResponse(items=topics, total=total, skip=skip, limit=limit)


@router.get("/topics/{topic_id}", response_model=HelpTopicResponse)
async def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
):
    """Get a single help topic with its descriptions."""
    service = HelpService(db)
    return service.get_topic(topic_id)


@router.get("/search", response_model=HelpTopicListResponse)
async def search_topics(
    q: str = Query(min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Search help topics by title and content."""
    service = HelpService(db)
    topics = service.search_topics(q, skip=skip, limit=limit)
    total = service.count_search(q)
    return HelpTopicListResponse(items=topics, total=total, skip=skip, limit=limit)


@router.get("/categories", response_model=list[HelpCategoryResponse])
async def list_categories(
    db: Session = Depends(get_db),
):
    """List all active help categories."""
    service = HelpService(db)
    return service.get_categories()


@router.get("/categories/{category_id}/topics", response_model=HelpTopicListResponse)
async def get_category_topics(
    category_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Get help topics for a specific category."""
    service = HelpService(db)
    topics = service.get_topics_by_category(category_id, skip=skip, limit=limit)
    total = service.count_topics_by_category(category_id)
    return HelpTopicListResponse(items=topics, total=total, skip=skip, limit=limit)


# --- Admin endpoints (auth required) ---

@router.post("/topics", response_model=HelpTopicResponse, status_code=201)
async def create_topic(
    topic_in: HelpTopicCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new help topic (admin only)."""
    service = HelpService(db)
    return service.create_topic(topic_in)


@router.put("/topics/{topic_id}", response_model=HelpTopicResponse)
async def update_topic(
    topic_id: int,
    topic_in: HelpTopicUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a help topic (admin only)."""
    service = HelpService(db)
    return service.update_topic(topic_id, topic_in)


@router.delete("/topics/{topic_id}", status_code=204)
async def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a help topic (admin only)."""
    service = HelpService(db)
    service.delete_topic(topic_id)


@router.post("/categories", response_model=HelpCategoryResponse, status_code=201)
async def create_category(
    category_in: HelpCategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new help category (admin only)."""
    service = HelpService(db)
    return service.create_category(category_in)


@router.put("/categories/{category_id}", response_model=HelpCategoryResponse)
async def update_category(
    category_id: int,
    category_in: HelpCategoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a help category (admin only)."""
    service = HelpService(db)
    return service.update_category(category_id, category_in)
