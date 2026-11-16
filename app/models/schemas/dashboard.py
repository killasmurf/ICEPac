"""Dashboard schemas."""

from pydantic import BaseModel


class PortfolioProject(BaseModel):
    """One project row in the portfolio overview."""

    project_id: int
    name: str
    status: str
    wbs_total: int
    wbs_approved: int
    wbs_submitted: int
    total_pert: float
    risk_count: int


class ApprovalTotals(BaseModel):
    """WBS item counts by approval status across all projects."""

    draft: int = 0
    submitted: int = 0
    approved: int = 0
    rejected: int = 0


class PortfolioResponse(BaseModel):
    """Portfolio overview: per-project summary plus global approval totals."""

    projects: list[PortfolioProject]
    approval_totals: ApprovalTotals
