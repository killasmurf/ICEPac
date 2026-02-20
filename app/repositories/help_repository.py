"""Help system repositories."""
from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.database.help import HelpCategory, HelpTopic
from app.repositories.base import BaseRepository


class HelpCategoryRepository(BaseRepository[HelpCategory]):
    def __init__(self, db: Session):
        super().__init__(HelpCategory, db)

    def get_active(self) -> List[HelpCategory]:
        """Get all active categories ordered by display_order."""
        stmt = (
            select(HelpCategory)
            .where(HelpCategory.is_active.is_(True))
            .order_by(HelpCategory.display_order)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_name(self, name: str) -> Optional[HelpCategory]:
        stmt = select(HelpCategory).where(HelpCategory.name == name)
        return self.db.scalars(stmt).first()


class HelpTopicRepository(BaseRepository[HelpTopic]):
    def __init__(self, db: Session):
        super().__init__(HelpTopic, db)

    def get_with_descriptions(self, topic_id: int) -> Optional[HelpTopic]:
        """Get a topic with its descriptions eagerly loaded."""
        stmt = (
            select(HelpTopic)
            .options(joinedload(HelpTopic.descriptions))
            .where(HelpTopic.id == topic_id)
        )
        return self.db.scalars(stmt).first()

    def get_active(self, skip: int = 0, limit: int = 100) -> List[HelpTopic]:
        """Get active topics with descriptions, ordered by display_order."""
        stmt = (
            select(HelpTopic)
            .options(joinedload(HelpTopic.descriptions))
            .where(HelpTopic.is_active.is_(True))
            .order_by(HelpTopic.display_order)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).unique().all())

    def count_active(self) -> int:
        """Count active topics."""
        stmt = (
            select(func.count())
            .select_from(HelpTopic)
            .where(HelpTopic.is_active.is_(True))
        )
        return self.db.scalar(stmt) or 0

    def get_by_category(
        self, category_id: int, skip: int = 0, limit: int = 100
    ) -> List[HelpTopic]:
        """Get active topics for a specific category."""
        stmt = (
            select(HelpTopic)
            .options(joinedload(HelpTopic.descriptions))
            .where(
                HelpTopic.category_id == category_id,
                HelpTopic.is_active.is_(True),
            )
            .order_by(HelpTopic.display_order)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).unique().all())

    def count_by_category(self, category_id: int) -> int:
        """Count active topics in a category."""
        stmt = (
            select(func.count())
            .select_from(HelpTopic)
            .where(
                HelpTopic.category_id == category_id,
                HelpTopic.is_active.is_(True),
            )
        )
        return self.db.scalar(stmt) or 0

    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[HelpTopic]:
        """Full-text search on title and content."""
        stmt = (
            select(HelpTopic)
            .where(
                HelpTopic.is_active.is_(True),
                or_(
                    HelpTopic.title.ilike(f"%{query}%"),
                    HelpTopic.content.ilike(f"%{query}%"),
                ),
            )
            .order_by(HelpTopic.display_order)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_search(self, query: str) -> int:
        """Count search results."""
        stmt = (
            select(func.count())
            .select_from(HelpTopic)
            .where(
                HelpTopic.is_active.is_(True),
                or_(
                    HelpTopic.title.ilike(f"%{query}%"),
                    HelpTopic.content.ilike(f"%{query}%"),
                ),
            )
        )
        return self.db.scalar(stmt) or 0
