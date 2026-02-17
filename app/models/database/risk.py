"""Risk database model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Risk(Base):
    """Risk model - maps to legacy tblRisks."""

    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)
    wbs_id = Column(Integer, ForeignKey("wbs.id"), nullable=False, index=True)
    risk_category_code = Column(
        String(50), ForeignKey("risk_categories.code"), nullable=True
    )
    risk_cost = Column(Numeric(18, 2), default=0)
    probability_code = Column(
        String(50), ForeignKey("probability_levels.code"), nullable=True
    )
    severity_code = Column(
        String(50), ForeignKey("severity_levels.code"), nullable=True
    )
    mitigation_plan = Column(Text, nullable=True)
    date_identified = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    wbs_item = relationship("WBS", back_populates="risks")

    def __repr__(self):
        return f"<Risk(id={self.id}, wbs={self.wbs_id}, cost={self.risk_cost})>"
