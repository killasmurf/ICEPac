"""Configuration/lookup table models.

Maps legacy tables: tblCostType, tblExpType, tblRegion, tblBus_Area,
tblEstimatingTechnique, tblRiskCategory, tblProbabilityOccurrence,
tblSeverityOccurrence, tblExpInd, tblPMBWeight.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String

from app.core.database import Base

# ============================================================
# Base classes for config tables
# ============================================================


class ConfigTableMixin:
    """Mixin for standard configuration tables."""

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WeightedConfigTableMixin(ConfigTableMixin):
    """Mixin for weighted configuration tables (probability, severity, etc.)."""

    weight = Column(Numeric(5, 2), nullable=False)


# ============================================================
# Standard Configuration Tables
# ============================================================


class CostType(ConfigTableMixin, Base):
    """Cost type classification - maps to legacy tblCostType."""

    __tablename__ = "tblCostType"

    def __repr__(self):
        return f"<CostType(code='{self.code}', desc='{self.description}')>"


class ExpenseType(ConfigTableMixin, Base):
    """Expense type - maps to legacy tblExpType."""

    __tablename__ = "tblExpType"

    def __repr__(self):
        return f"<ExpenseType(code='{self.code}')>"


class Region(ConfigTableMixin, Base):
    """Geographic region - maps to legacy tblRegion."""

    __tablename__ = "tblRegion"

    def __repr__(self):
        return f"<Region(code='{self.code}')>"


class BusinessArea(ConfigTableMixin, Base):
    """Business area - maps to legacy tblBus_Area."""

    __tablename__ = "tblBus_Area"

    def __repr__(self):
        return f"<BusinessArea(code='{self.code}')>"


class EstimatingTechnique(ConfigTableMixin, Base):
    """Estimating technique - maps to legacy tblEstimatingTechnique."""

    __tablename__ = "tblEstimatingTechnique"

    def __repr__(self):
        return f"<EstimatingTechnique(code='{self.code}')>"


class RiskCategory(ConfigTableMixin, Base):
    """Risk category - maps to legacy tblRiskCategory."""

    __tablename__ = "tblRiskCategory"

    def __repr__(self):
        return f"<RiskCategory(code='{self.code}')>"


class ExpenditureIndicator(ConfigTableMixin, Base):
    """Expenditure indicator - maps to legacy tblExpInd."""

    __tablename__ = "tblExpInd"

    def __repr__(self):
        return f"<ExpenditureIndicator(code='{self.code}')>"


# ============================================================
# Weighted Configuration Tables
# ============================================================


class ProbabilityLevel(Base):
    """Probability level for risk assessment.

    Maps to legacy tblProbabilityOccurrence.
    """

    __tablename__ = "tblProbabilityOccurrence"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ProbabilityLevel(code='{self.code}', weight={self.weight})>"


class SeverityLevel(Base):
    """Severity level for risk assessment - maps to legacy tblSeverityOccurrence."""

    __tablename__ = "tblSeverityOccurrence"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<SeverityLevel(code='{self.code}', weight={self.weight})>"


class PMBWeight(Base):
    """Project Management Baseline weight - maps to legacy tblPMBWeight."""

    __tablename__ = "tblPMBWeight"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<PMBWeight(code='{self.code}', weight={self.weight})>"


# ============================================================
# Model Registry for Dynamic Access
# ============================================================

CONFIG_MODELS = {
    "cost-types": CostType,
    "expense-types": ExpenseType,
    "regions": Region,
    "business-areas": BusinessArea,
    "estimating-techniques": EstimatingTechnique,
    "risk-categories": RiskCategory,
    "expenditure-indicators": ExpenditureIndicator,
}

WEIGHTED_CONFIG_MODELS = {
    "probability-levels": ProbabilityLevel,
    "severity-levels": SeverityLevel,
    "pmb-weights": PMBWeight,
}

ALL_CONFIG_MODELS = {**CONFIG_MODELS, **WEIGHTED_CONFIG_MODELS}
