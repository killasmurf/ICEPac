import client from './client';

// ============================================================
// Assignment types
// ============================================================

export interface Assignment {
  id: number;
  wbs_id: number;
  resource_code: string;
  supplier_code: string | null;
  cost_type_code: string | null;
  region_code: string | null;
  bus_area_code: string | null;
  estimating_technique_code: string | null;
  best_estimate: number;
  likely_estimate: number;
  worst_estimate: number;
  duty_pct: number;
  import_content_pct: number;
  aii_pct: number;
  pert_estimate: number;
  std_deviation: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentCreate {
  resource_code: string;
  supplier_code?: string;
  cost_type_code?: string;
  region_code?: string;
  bus_area_code?: string;
  estimating_technique_code?: string;
  best_estimate?: number;
  likely_estimate?: number;
  worst_estimate?: number;
  duty_pct?: number;
  import_content_pct?: number;
  aii_pct?: number;
}

export interface AssignmentUpdate {
  resource_code?: string;
  supplier_code?: string;
  cost_type_code?: string;
  region_code?: string;
  bus_area_code?: string;
  estimating_technique_code?: string;
  best_estimate?: number;
  likely_estimate?: number;
  worst_estimate?: number;
  duty_pct?: number;
  import_content_pct?: number;
  aii_pct?: number;
}

export interface AssignmentListResponse {
  items: Assignment[];
  total: number;
}

// ============================================================
// Risk types
// ============================================================

export interface Risk {
  id: number;
  wbs_id: number;
  risk_category_code: string;
  risk_cost: number;
  probability_code: string | null;
  severity_code: string | null;
  mitigation_plan: string | null;
  risk_exposure: number;
  created_at: string;
  updated_at: string;
}

export interface RiskCreate {
  risk_category_code: string;
  risk_cost?: number;
  probability_code?: string;
  severity_code?: string;
  mitigation_plan?: string;
}

export interface RiskUpdate {
  risk_category_code?: string;
  risk_cost?: number;
  probability_code?: string;
  severity_code?: string;
  mitigation_plan?: string;
}

export interface RiskListResponse {
  items: Risk[];
  total: number;
}

// ============================================================
// Estimation summary types
// ============================================================

export interface WBSCostSummary {
  wbs_id: number;
  wbs_code: string | null;
  wbs_title: string;
  assignment_count: number;
  total_pert_estimate: number;
  total_std_deviation: number;
  confidence_80_low: number;
  confidence_80_high: number;
  risk_count: number;
  total_risk_exposure: number;
  risk_adjusted_estimate: number;
  approval_status: string;
}

export interface CostBreakdownItem {
  code: string;
  description: string;
  total_pert: number;
  assignment_count: number;
}

export interface SupplierBreakdownItem {
  code: string;
  name: string;
  total_pert: number;
  assignment_count: number;
}

export interface ProjectEstimationSummary {
  project_id: number;
  project_name: string;
  total_wbs_items: number;
  total_assignments: number;
  total_pert_estimate: number;
  total_std_deviation: number;
  confidence_80_low: number;
  confidence_80_high: number;
  total_risks: number;
  total_risk_exposure: number;
  risk_adjusted_estimate: number;
  by_cost_type: CostBreakdownItem[];
  by_region: CostBreakdownItem[];
  by_resource: CostBreakdownItem[];
  by_supplier: SupplierBreakdownItem[];
  wbs_summaries: WBSCostSummary[];
}

// ============================================================
// Approval types
// ============================================================

export type ApprovalActionType = 'submit' | 'approve' | 'reject' | 'reset';

export interface ApprovalAction {
  action: ApprovalActionType;
  comment?: string;
}

export interface WBSApprovalResponse {
  wbs_id: number;
  approval_status: string;
  approver: string | null;
  approver_date: string | null;
  estimate_revision: number;
}

// ============================================================
// Assignment API functions
// ============================================================

export async function getAssignments(projectId: number, wbsId: number): Promise<AssignmentListResponse> {
  const response = await client.get(`/projects/${projectId}/wbs/${wbsId}/assignments`);
  return response.data;
}

export async function getAssignment(projectId: number, wbsId: number, assignmentId: number): Promise<Assignment> {
  const response = await client.get(`/projects/${projectId}/wbs/${wbsId}/assignments/${assignmentId}`);
  return response.data;
}

export async function createAssignment(projectId: number, wbsId: number, data: AssignmentCreate): Promise<Assignment> {
  const response = await client.post(`/projects/${projectId}/wbs/${wbsId}/assignments`, data);
  return response.data;
}

export async function updateAssignment(
  projectId: number,
  wbsId: number,
  assignmentId: number,
  data: AssignmentUpdate
): Promise<Assignment> {
  const response = await client.put(`/projects/${projectId}/wbs/${wbsId}/assignments/${assignmentId}`, data);
  return response.data;
}

export async function deleteAssignment(projectId: number, wbsId: number, assignmentId: number): Promise<void> {
  await client.delete(`/projects/${projectId}/wbs/${wbsId}/assignments/${assignmentId}`);
}

// ============================================================
// Risk API functions
// ============================================================

export async function getRisks(projectId: number, wbsId: number): Promise<RiskListResponse> {
  const response = await client.get(`/projects/${projectId}/wbs/${wbsId}/risks`);
  return response.data;
}

export async function getRisk(projectId: number, wbsId: number, riskId: number): Promise<Risk> {
  const response = await client.get(`/projects/${projectId}/wbs/${wbsId}/risks/${riskId}`);
  return response.data;
}

export async function createRisk(projectId: number, wbsId: number, data: RiskCreate): Promise<Risk> {
  const response = await client.post(`/projects/${projectId}/wbs/${wbsId}/risks`, data);
  return response.data;
}

export async function updateRisk(
  projectId: number,
  wbsId: number,
  riskId: number,
  data: RiskUpdate
): Promise<Risk> {
  const response = await client.put(`/projects/${projectId}/wbs/${wbsId}/risks/${riskId}`, data);
  return response.data;
}

export async function deleteRisk(projectId: number, wbsId: number, riskId: number): Promise<void> {
  await client.delete(`/projects/${projectId}/wbs/${wbsId}/risks/${riskId}`);
}

// ============================================================
// Estimation API functions
// ============================================================

export async function getProjectEstimation(projectId: number): Promise<ProjectEstimationSummary> {
  const response = await client.get(`/projects/${projectId}/estimation`);
  return response.data;
}

export async function getWBSEstimation(projectId: number, wbsId: number): Promise<WBSCostSummary> {
  const response = await client.get(`/projects/${projectId}/wbs/${wbsId}/estimation`);
  return response.data;
}

// ============================================================
// Approval API functions
// ============================================================

export async function getApprovalStatus(projectId: number, wbsId: number): Promise<WBSApprovalResponse> {
  const response = await client.get(`/projects/${projectId}/wbs/${wbsId}/approval`);
  return response.data;
}

export async function processApproval(
  projectId: number,
  wbsId: number,
  action: ApprovalAction
): Promise<WBSApprovalResponse> {
  const response = await client.post(`/projects/${projectId}/wbs/${wbsId}/approval`, action);
  return response.data;
}

// ============================================================
// Helper functions
// ============================================================

/**
 * Calculate PERT estimate from three-point values.
 * Formula: (best + 4*likely + worst) / 6
 */
export function calculatePERT(best: number, likely: number, worst: number): number {
  return (best + 4 * likely + worst) / 6;
}

/**
 * Calculate standard deviation from three-point values.
 * Formula: (worst - best) / 6
 */
export function calculateStdDeviation(best: number, worst: number): number {
  return (worst - best) / 6;
}

/**
 * Calculate 80% confidence interval bounds.
 * Uses z=1.28 for 80% confidence level.
 */
export function calculate80ConfidenceInterval(
  pert: number,
  stdDev: number
): { low: number; high: number } {
  const z = 1.28;
  return {
    low: pert - z * stdDev,
    high: pert + z * stdDev,
  };
}
