"""Help system service."""
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.database.help import HelpCategory, HelpTopic
from app.models.schemas.help import (
    HelpCategoryCreate, HelpCategoryUpdate,
    HelpTopicCreate, HelpTopicUpdate,
)
from app.repositories.help_repository import HelpCategoryRepository, HelpTopicRepository


class HelpService:
    def __init__(self, db: Session):
        self.db = db
        self.category_repo = HelpCategoryRepository(db)
        self.topic_repo = HelpTopicRepository(db)

    # --- Category methods ---

    def get_categories(self) -> List[HelpCategory]:
        """Get all active categories."""
        return self.category_repo.get_active()

    def create_category(self, category_in: HelpCategoryCreate) -> HelpCategory:
        if self.category_repo.get_by_name(category_in.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists",
            )
        return self.category_repo.create(category_in.model_dump())

    def update_category(self, category_id: int, category_in: HelpCategoryUpdate) -> HelpCategory:
        category = self.category_repo.get(category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        update_data = category_in.model_dump(exclude_unset=True)
        if "name" in update_data and update_data["name"] != category.name:
            if self.category_repo.get_by_name(update_data["name"]):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Category name already exists",
                )
        return self.category_repo.update(category, update_data)

    # --- Topic methods ---

    def get_topics(self, skip: int = 0, limit: int = 100) -> List[HelpTopic]:
        """Get all active topics with descriptions."""
        return self.topic_repo.get_active(skip=skip, limit=limit)

    def count_topics(self) -> int:
        """Count active topics."""
        return self.topic_repo.count_active()

    def get_topic(self, topic_id: int) -> HelpTopic:
        """Get a single topic with descriptions."""
        topic = self.topic_repo.get_with_descriptions(topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
        return topic

    def get_topics_by_category(self, category_id: int, skip: int = 0, limit: int = 100) -> List[HelpTopic]:
        """Get topics for a specific category."""
        category = self.category_repo.get(category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return self.topic_repo.get_by_category(category_id, skip=skip, limit=limit)

    def count_topics_by_category(self, category_id: int) -> int:
        """Count topics in a category."""
        return self.topic_repo.count_by_category(category_id)

    def search_topics(self, query: str, skip: int = 0, limit: int = 100) -> List[HelpTopic]:
        """Search topics by title and content."""
        return self.topic_repo.search(query, skip=skip, limit=limit)

    def count_search(self, query: str) -> int:
        """Count search results."""
        return self.topic_repo.count_search(query)

    def create_topic(self, topic_in: HelpTopicCreate) -> HelpTopic:
        """Create a new help topic."""
        category = self.category_repo.get(topic_in.category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return self.topic_repo.create(topic_in.model_dump())

    def update_topic(self, topic_id: int, topic_in: HelpTopicUpdate) -> HelpTopic:
        """Update an existing help topic."""
        topic = self.topic_repo.get(topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
        update_data = topic_in.model_dump(exclude_unset=True)
        if "category_id" in update_data:
            category = self.category_repo.get(update_data["category_id"])
            if not category:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return self.topic_repo.update(topic, update_data)

    def delete_topic(self, topic_id: int) -> bool:
        """Delete a help topic."""
        topic = self.topic_repo.get(topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
        return self.topic_repo.delete(topic_id)
