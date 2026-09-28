import client from './client';

// ============================================================
// Types
// ============================================================

export type ReportType = 'cost_control' | 'boe' | 'risk_summary' | 'wbs_summary' | 'resource_utilization';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface Report {
  id: number;
  project_id: number;
  report_type: ReportType;
  report_format: ReportFormat;
  status: ReportStatus;
  title: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReportListResponse {
  items: Report[];
  total: number;
}

export interface ReportRequest {
  report_type: ReportType;
  report_format?: ReportFormat;
  title?: string;
}

// Cost Control report data
export interface CostControlLineItem {
  wbs_code: string | null;
  wbs_title: string;
  assignment_count: number;
  best_estimate: number;
  likely_estimate: number;
  worst_estimate: number;
  pert_estimate: number;
  std_deviation: number;
  risk_exposure: number;
  risk_adjusted: number;
  approval_status: string;
}

export interface CostControlReport {
  project_id: number;
  project_name: string;
  generated_at: string;
  total_pert: number;
  total_risk_exposure: number;
  total_risk_adjusted: number;
  confidence_80_low: number;
  confidence_80_high: number;
  line_items: CostControlLineItem[];
}

// BOE report data
export interface BOELineItem {
  wbs_code: string | null;
  wbs_title: string;
  resource_code: string;
  cost_type_code: string | null;
  estimating_technique_code: string | null;
  best_estimate: number;
  likely_estimate: number;
  worst_estimate: number;
  pert_estimate: number;
  rationale: string | null;
}

export interface BOEReport {
  project_id: number;
  project_name: string;
  generated_at: string;
  total_pert: number;
  line_items: BOELineItem[];
}

// Risk Summary report data
export interface RiskSummaryItem {
  wbs_code: string | null;
  wbs_title: string;
  risk_count: number;
  total_exposure: number;
  max_exposure: number;
}

export interface RiskSummaryReport {
  project_id: number;
  project_name: string;
  generated_at: string;
  total_risks: number;
  total_exposure: number;
  items: RiskSummaryItem[];
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  cost_control: 'Cost Control Report',
  boe: 'Basis of Estimate (BOE)',
  risk_summary: 'Risk Summary',
  wbs_summary: 'WBS Summary',
  resource_utilization: 'Resource Utilization',
};

// ============================================================
// API functions
// ============================================================

export async function listReports(projectId: number, skip = 0, limit = 50): Promise<ReportListResponse> {
  const response = await client.get(`/projects/${projectId}/reports`, { params: { skip, limit } });
  return response.data;
}

export async function generateReport(projectId: number, data: ReportRequest): Promise<Report> {
  const response = await client.post(`/projects/${projectId}/reports`, data);
  return response.data;
}

export async function getReport(projectId: number, reportId: number): Promise<Report> {
  const response = await client.get(`/projects/${projectId}/reports/${reportId}`);
  return response.data;
}

export async function getReportData(projectId: number, reportId: number): Promise<CostControlReport | BOEReport | RiskSummaryReport | Record<string, unknown>> {
  const response = await client.get(`/projects/${projectId}/reports/${reportId}/data`);
  return response.data;
}

export async function deleteReport(projectId: number, reportId: number): Promise<void> {
  await client.delete(`/projects/${projectId}/reports/${reportId}`);
}
