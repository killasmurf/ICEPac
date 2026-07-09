"""Risk database model."""
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Risk(Base):
    """Risk model - maps to legacy tblRisks.

    A Risk is scoped to EXACTLY ONE parent: either a WBS item (legacy WBS-scoped
    risks) OR a Project (project-wide risks introduced for the project-level
    risk register). The XOR invariant is enforced at the database level by
    the ck_risk_xor_parent CHECK constraint — at most one of (wbs_id,
    project_id) may be set, and at least one must be set.
    """

    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)
    # wbs_id is nullable now (was NOT NULL pre-US-006). Project-scoped risks
    # leave it NULL. The CHECK constraint enforces exactly-one-of.
    wbs_id = Column(Integer, ForeignKey("wbs.id"), nullable=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    title = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, server_default="open")
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
    project = relationship("Project", back_populates="project_risks")

    __table_args__ = (
        CheckConstraint(
            "(wbs_id IS NOT NULL) <> (project_id IS NOT NULL)",
            name="ck_risk_xor_parent",
        ),
        Index("ix_risks_project_id", "project_id"),
    )

    def __repr__(self):
        if self.project_id is not None:
            return (
                f"<Risk(id={self.id}, project={self.project_id}, "
                f"title='{self.title[:40]}', cost={self.risk_cost})>"
            )
        return (
            f"<Risk(id={self.id}, wbs={self.wbs_id}, "
            f"title='{self.title[:40]}', cost={self.risk_cost})>"
        )
