"""Configuration table database models for all admin lookup tables."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from app.core.database import Base


class ConfigTableMixin:
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class CostType(ConfigTableMixin, Base):
    __tablename__ = "tblCostType"
    code = Column(String(20), unique=True, nullable=True)

class ExpenseType(ConfigTableMixin, Base):
    __tablename__ = "tblExpType"
    code = Column(String(20), unique=True, nullable=True)

class Region(ConfigTableMixin, Base):
    __tablename__ = "tblRegion"
    code = Column(String(20), unique=True, nullable=True)

class BusinessArea(ConfigTableMixin, Base):
    __tablename__ = "tblBus_Area"
    code = Column(String(20), unique=True, nullable=True)

class EstimatingTechnique(ConfigTableMixin, Base):
    __tablename__ = "tblEstimatingTechnique"
    code = Column(String(20), unique=True, nullable=True)

class RiskCategory(ConfigTableMixin, Base):
    __tablename__ = "tblRiskCategory"
    code = Column(String(20), unique=True, nullable=True)

class ExpenditureIndicator(ConfigTableMixin, Base):
    __tablename__ = "tblExpInd"
    code = Column(String(20), unique=True, nullable=True)

class ProbabilityLevel(ConfigTableMixin, Base):
    __tablename__ = "tblProbabilityOccurrence"
    weight = Column(Float, nullable=False, default=0.0)
    level = Column(Integer, nullable=False, default=1)

class SeverityLevel(ConfigTableMixin, Base):
    __tablename__ = "tblSeverityOccurrence"
    weight = Column(Float, nullable=False, default=0.0)
    level = Column(Integer, nullable=False, default=1)

class PMBWeight(ConfigTableMixin, Base):
    __tablename__ = "tblPMBWeight"
    weight = Column(Float, nullable=False, default=0.0)
    category = Column(String(50), nullable=True)

ALL_CONFIG_MODELS = {
    "cost_types": CostType, "expense_types": ExpenseType, "regions": Region,
    "business_areas": BusinessArea, "estimating_techniques": EstimatingTechnique,
    "risk_categories": RiskCategory, "expenditure_indicators": ExpenditureIndicator,
    "probability_levels": ProbabilityLevel, "severity_levels": SeverityLevel,
    "pmb_weights": PMBWeight,
}
WEIGHTED_TABLES = {"probability_levels", "severity_levels", "pmb_weights"}
