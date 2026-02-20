"""Help system database models."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class HelpCategory(Base):
    """Help category model - groups related help topics."""

    __tablename__ = "help_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    topics = relationship(
        "HelpTopic", back_populates="category", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<HelpCategory(id={self.id}, name='{self.name}')>"


class HelpTopic(Base):
    """Help topic model - maps to legacy tblHelp."""

    __tablename__ = "help_topics"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("help_categories.id"), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    category = relationship("HelpCategory", back_populates="topics")
    descriptions = relationship(
        "HelpDescription", back_populates="topic", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<HelpTopic(id={self.id}, title='{self.title}')>"


class HelpDescription(Base):
    """Help description model - maps to legacy tblHelpDescr."""

    __tablename__ = "help_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("help_topics.id"), nullable=False)
    section_number = Column(Integer, default=1, nullable=False)
    detailed_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    topic = relationship("HelpTopic", back_populates="descriptions")

    def __repr__(self):
        return (
            f"<HelpDescription(id={self.id}, "
            f"topic_id={self.topic_id}, section={self.section_number})>"
        )
