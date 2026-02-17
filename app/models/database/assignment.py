"""Resource Assignment database model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class ResourceAssignment(Base):
    """Resource Assignment model - maps to legacy tblResourceAssignment."""

    __tablename__ = "resource_assignments"

    id = Column(Integer, primary_key=True, index=True)
    wbs_id = Column(Integer, ForeignKey("wbs.id"), nullable=False, index=True)
    resource_code = Column(
        String(50), ForeignKey("resources.resource_code"), nullable=False
    )
    supplier_code = Column(
        String(50), ForeignKey("suppliers.supplier_code"), nullable=True
    )
    cost_type_code = Column(String(50), ForeignKey("cost_types.code"), nullable=True)
    region_code = Column(String(50), ForeignKey("regions.code"), nullable=True)
    bus_area_code = Column(String(50), ForeignKey("business_areas.code"), nullable=True)
    estimating_technique_code = Column(
        String(50), ForeignKey("estimating_techniques.code"), nullable=True
    )

    # Three-point estimation
    best_estimate = Column(Numeric(18, 2), default=0)
    likely_estimate = Column(Numeric(18, 2), default=0)
    worst_estimate = Column(Numeric(18, 2), default=0)

    # Tracking percentages
    duty_pct = Column(Numeric(5, 2), default=100)
    import_content_pct = Column(Numeric(5, 2), default=0)
    aii_pct = Column(Numeric(5, 2), default=0)  # Actual Import Implementation

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    wbs_item = relationship("WBS", back_populates="assignments")

    @property
    def pert_estimate(self) -> float:
        """PERT estimate: (Best + 4*Likely + Worst) / 6"""
        return float(
            (self.best_estimate + 4 * self.likely_estimate + self.worst_estimate) / 6
        )

    @property
    def std_deviation(self) -> float:
        """Standard deviation: (Worst - Best) / 6"""
        return float((self.worst_estimate - self.best_estimate) / 6)

    def __repr__(self):
        return (
            f"<ResourceAssignment(id={self.id}, "
            f"wbs={self.wbs_id}, resource='{self.resource_code}')>"
        )
