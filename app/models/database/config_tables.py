"""Configuration/lookup table models.

Maps legacy tables: tblCostType, tblExpType, tblRegion, tblBus_Area,
tblEstimatingTechnique, tblRiskCategory, tblProbabilityOccurrence,
tblSeverityOccurrence, tblExpInd, tblPMBWeight.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric

from app.core.database import Base


class CostType(Base):
    """Cost type classification - maps to legacy tblCostType."""

    __tablename__ = "cost_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<CostType(code='{self.code}', desc='{self.description}')>"


class ExpenseType(Base):
    """Expense type - maps to legacy tblExpType."""

    __tablename__ = "expense_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ExpenseType(code='{self.code}')>"


class Region(Base):
    """Geographic region - maps to legacy tblRegion."""

    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Region(code='{self.code}')>"


class BusinessArea(Base):
    """Business area - maps to legacy tblBus_Area."""

    __tablename__ = "business_areas"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<BusinessArea(code='{self.code}')>"


class EstimatingTechnique(Base):
    """Estimating technique - maps to legacy tblEstimatingTechnique."""

    __tablename__ = "estimating_techniques"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<EstimatingTechnique(code='{self.code}')>"


class RiskCategory(Base):
    """Risk category - maps to legacy tblRiskCategory."""

    __tablename__ = "risk_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<RiskCategory(code='{self.code}')>"


class ProbabilityLevel(Base):
    """Probability of occurrence level - maps to legacy tblProbabilityOccurrence."""

    __tablename__ = "probability_levels"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ProbabilityLevel(code='{self.code}')>"


class SeverityLevel(Base):
    """Severity of occurrence level - maps to legacy tblSeverityOccurrence."""

    __tablename__ = "severity_levels"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<SeverityLevel(code='{self.code}')>"


class ExpenditureIndicator(Base):
    """Expenditure indicator - maps to legacy tblExpInd."""

    __tablename__ = "expenditure_indicators"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ExpenditureIndicator(code='{self.code}')>"


class PMBWeight(Base):
    """PMB (Project Management Baseline) weight - maps to legacy tblPMBWeight."""

    __tablename__ = "pmb_weights"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 4), default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<PMBWeight(code='{self.code}', weight={self.weight})>"
