import client from './client';
import { toNumber, toNumberOr0 } from '../utils/number';

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
  /** Exactly one of wbs_id / project_id is set. WBS-scoped risks have wbs_id. */
  wbs_id: number | null;
  project_id: number | null;
  title: string;
  status: string;
  risk_category_code: string | null;
  risk_cost: number;
  probability_code: string | null;
  severity_code: string | null;
  mitigation_plan: string | null;
  date_identified: string;
  risk_exposure: number | null;
  created_at: string;
  updated_at: string;
}

export interface RiskCreate {
  /** Required by the API (max 255). */
  title: string;
  /** open | mitigated | closed. Defaults to open on the server. */
  status?: string;
  risk_category_code?: string;
  risk_cost?: number;
  probability_code?: string;
  severity_code?: string;
  mitigation_plan?: string;
}

export interface RiskUpdate {
  title?: string;
  status?: string;
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
// Decimal normalisation
// ============================================================
// FastAPI serialises Decimal fields as strings ("12000.00"). The API layer converts them to numbers so
// components only ever see numbers.

type Raw<T, K extends keyof T> = Omit<T, K> & { [P in K]: number | string | null | undefined };

const ASSIGNMENT_NUMERIC = [
  'best_estimate',
  'likely_estimate',
  'worst_estimate',
  'duty_pct',
  'import_content_pct',
  'aii_pct',
  'pert_estimate',
  'std_deviation',
] as const;

export type RawAssignment = Raw<Assignment, (typeof ASSIGNMENT_NUMERIC)[number]>;

export function normalizeAssignment(raw: RawAssignment): Assignment {
  const out = { ...raw } as Record<string, unknown>;
  for (const key of ASSIGNMENT_NUMERIC) out[key] = toNumberOr0(raw[key]);
  return out as unknown as Assignment;
}

export type RawRisk = Omit<Risk, 'risk_cost' | 'risk_exposure'> & {
  risk_cost: number | string | null | undefined;
  risk_exposure: number | string | null | undefined;
};

export function normalizeRisk(raw: RawRisk): Risk {
  return { ...raw, risk_cost: toNumberOr0(raw.risk_cost), risk_exposure: toNumber(raw.risk_exposure) };
}

const WBS_SUMMARY_NUMERIC = [
  'assignment_count',
  'total_pert_estimate',
  'total_std_deviation',
  'confidence_80_low',
  'confidence_80_high',
  'risk_count',
  'total_risk_exposure',
  'risk_adjusted_estimate',
] as const;

export type RawWBSCostSummary = Raw<WBSCostSummary, (typeof WBS_SUMMARY_NUMERIC)[number]>;

export function normalizeWBSCostSummary(raw: RawWBSCostSummary): WBSCostSummary {
  const out = { ...raw } as Record<string, unknown>;
  for (const key of WBS_SUMMARY_NUMERIC) out[key] = toNumberOr0(raw[key]);
  return out as unknown as WBSCostSummary;
}

const normalizeBreakdown = <T extends { total_pert: number; assignment_count: number }>(
  raw: Raw<T, 'total_pert' | 'assignment_count'>
): T =>
  ({ ...raw, total_pert: toNumberOr0(raw.total_pert), assignment_count: toNumberOr0(raw.assignment_count) }) as unknown as T;

export interface RawProjectEstimationSummary
  extends Omit<
    ProjectEstimationSummary,
    | 'total_pert_estimate'
    | 'total_std_deviation'
    | 'confidence_80_low'
    | 'confidence_80_high'
    | 'total_risk_exposure'
    | 'risk_adjusted_estimate'
    | 'by_cost_type'
    | 'by_region'
    | 'by_resource'
    | 'by_supplier'
    | 'wbs_summaries'
  > {
  total_pert_estimate: number | string | null;
  total_std_deviation: number | string | null;
  confidence_80_low: number | string | null;
  confidence_80_high: number | string | null;
  total_risk_exposure: number | string | null;
  risk_adjusted_estimate: number | string | null;
  by_cost_type: Raw<CostBreakdownItem, 'total_pert' | 'assignment_count'>[];
  by_region: Raw<CostBreakdownItem, 'total_pert' | 'assignment_count'>[];
  by_resource: Raw<CostBreakdownItem, 'total_pert' | 'assignment_count'>[];
  by_supplier: Raw<SupplierBreakdownItem, 'total_pert' | 'assignment_count'>[];
  wbs_summaries: RawWBSCostSummary[];
}

export function normalizeProjectEstimation(raw: RawProjectEstimationSummary): ProjectEstimationSummary {
  return {
    ...raw,
    total_pert_estimate: toNumberOr0(raw.total_pert_estimate),
    total_std_deviation: toNumberOr0(raw.total_std_deviation),
    confidence_80_low: toNumberOr0(raw.confidence_80_low),
    confidence_80_high: toNumberOr0(raw.confidence_80_high),
    total_risk_exposure: toNumberOr0(raw.total_risk_exposure),
    risk_adjusted_estimate: toNumberOr0(raw.risk_adjusted_estimate),
    by_cost_type: (raw.by_cost_type ?? []).map((i) => normalizeBreakdown<CostBreakdownItem>(i)),
    by_region: (raw.by_region ?? []).map((i) => normalizeBreakdown<CostBreakdownItem>(i)),
    by_resource: (raw.by_resource ?? []).map((i) => normalizeBreakdown<CostBreakdownItem>(i)),
    by_supplier: (raw.by_supplier ?? []).map((i) => normalizeBreakdown<SupplierBreakdownItem>(i)),
    wbs_summaries: (raw.wbs_summaries ?? []).map(normalizeWBSCostSummary),
  };
}

// ============================================================
// Assignment API functions
// ============================================================

export async function getAssignments(projectId: number, wbsId: number): Promise<AssignmentListResponse> {
  const response = await client.get<{ items: RawAssignment[]; total: number }>(`/projects/${projectId}/wbs/${wbsId}/assignments`);
  return { ...response.data, items: response.data.items.map(normalizeAssignment) };
}

export async function getAssignment(projectId: number, wbsId: number, assignmentId: number): Promise<Assignment> {
  const response = await client.get<RawAssignment>(`/projects/${projectId}/wbs/${wbsId}/assignments/${assignmentId}`);
  return normalizeAssignment(response.data);
}

export async function createAssignment(projectId: number, wbsId: number, data: AssignmentCreate): Promise<Assignment> {
  const response = await client.post<RawAssignment>(`/projects/${projectId}/wbs/${wbsId}/assignments`, data);
  return normalizeAssignment(response.data);
}

export async function updateAssignment(
  projectId: number,
  wbsId: number,
  assignmentId: number,
  data: AssignmentUpdate
): Promise<Assignment> {
  const response = await client.put<RawAssignment>(`/projects/${projectId}/wbs/${wbsId}/assignments/${assignmentId}`, data);
  return normalizeAssignment(response.data);
}

export async function deleteAssignment(projectId: number, wbsId: number, assignmentId: number): Promise<void> {
  await client.delete(`/projects/${projectId}/wbs/${wbsId}/assignments/${assignmentId}`);
}

// ============================================================
// Risk API functions
// ============================================================

export async function getRisks(projectId: number, wbsId: number): Promise<RiskListResponse> {
  const response = await client.get<{ items: RawRisk[]; total: number }>(`/projects/${projectId}/wbs/${wbsId}/risks`);
  return { ...response.data, items: response.data.items.map(normalizeRisk) };
}

export async function getRisk(projectId: number, wbsId: number, riskId: number): Promise<Risk> {
  const response = await client.get<RawRisk>(`/projects/${projectId}/wbs/${wbsId}/risks/${riskId}`);
  return normalizeRisk(response.data);
}

export async function createRisk(projectId: number, wbsId: number, data: RiskCreate): Promise<Risk> {
  const response = await client.post<RawRisk>(`/projects/${projectId}/wbs/${wbsId}/risks`, data);
  return normalizeRisk(response.data);
}

export async function updateRisk(
  projectId: number,
  wbsId: number,
  riskId: number,
  data: RiskUpdate
): Promise<Risk> {
  const response = await client.put<RawRisk>(`/projects/${projectId}/wbs/${wbsId}/risks/${riskId}`, data);
  return normalizeRisk(response.data);
}

export async function deleteRisk(projectId: number, wbsId: number, riskId: number): Promise<void> {
  await client.delete(`/projects/${projectId}/wbs/${wbsId}/risks/${riskId}`);
}

// ============================================================
// Estimation API functions
// ============================================================

export async function getProjectEstimation(projectId: number): Promise<ProjectEstimationSummary> {
  const response = await client.get<RawProjectEstimationSummary>(`/projects/${projectId}/estimation`);
  return normalizeProjectEstimation(response.data);
}

export async function getWBSEstimation(projectId: number, wbsId: number): Promise<WBSCostSummary> {
  const response = await client.get<RawWBSCostSummary>(`/projects/${projectId}/wbs/${wbsId}/estimation`);
  return normalizeWBSCostSummary(response.data);
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
