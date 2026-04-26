/**
 * Reports API Client - TypeScript client for the report generation engine.
 */
import client from './client';

// ── Types ────────────────────────────────────────────────────

export type ReportType =
  | 'cost_by_wbs' | 'cost_by_resource' | 'cost_by_supplier'
  | 'cost_by_eoc' | 'cost_by_technique' | 'cost_by_region'
  | 'boe_summary' | 'boe_detailed' | 'boe_by_wbs'
  | 'risk_assessment' | 'risk_summary'
  | 'estimator_activity' | 'approver_activity' | 'change_history'
  | 'resource_utilization' | 'project_summary';

export type ExportFormat = 'json' | 'pdf' | 'xlsx' | 'docx' | 'csv';

export interface ReportFilter {
  project_id: number;
  date_from?: string;
  date_to?: string;
  wbs_ids?: number[];
  cost_type_codes?: string[];
  region_codes?: string[];
  resource_codes?: string[];
  supplier_codes?: string[];
  technique_codes?: string[];
  include_inactive?: boolean;
  approval_status?: string;
}

export interface ReportRequest {
  report_type: ReportType;
  filters: ReportFilter;
  export_format?: ExportFormat;
  title?: string;
  include_charts?: boolean;
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportResult {
  report_type: string;
  title: string;
  generated_at: string;
  project_name: string;
  filters_applied: Record<string, any>;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
  row_count: number;
  metadata?: Record<string, any>;
}

export interface ReportCatalogEntry {
  type: string;
  label: string;
  description: string;
}

export interface ReportCategory {
  label: string;
  reports: ReportCatalogEntry[];
}

export type ReportCatalog = Record<string, ReportCategory>;

export interface ReportJob {
  id: number;
  report_type: string;
  status: string;
  output_format: string;
  row_count: number;
  file_path?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// ── API Functions ────────────────────────────────────────────

export const reportsApi = {
  getCatalog: () =>
    client.get<ReportCatalog>('/reports/catalog').then(r => r.data),

  getTypes: () =>
    client.get<{ value: string; label: string }[]>('/reports/types').then(r => r.data),

  generate: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/generate', request).then(r => r.data),

  export: async (request: ReportRequest): Promise<void> => {
    const resp = await client.post('/reports/export', request, { responseType: 'blob' });
    const blob = new Blob([resp.data]);
    const contentDisp = resp.headers['content-disposition'] || '';
    const match = contentDisp.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `report.${request.export_format || 'pdf'}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Convenience endpoints
  costByWbs: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/cost-by-wbs', request).then(r => r.data),

  costByResource: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/cost-by-resource', request).then(r => r.data),

  costBySupplier: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/cost-by-supplier', request).then(r => r.data),

  costByEoc: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/cost-by-eoc', request).then(r => r.data),

  boeSummary: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/boe-summary', request).then(r => r.data),

  boeDetailed: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/boe-detailed', request).then(r => r.data),

  riskAssessment: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/risk-assessment', request).then(r => r.data),

  riskSummary: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/risk-summary', request).then(r => r.data),

  changeHistory: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/change-history', request).then(r => r.data),

  // Async jobs
  createJob: (request: ReportRequest) =>
    client.post<ReportJob>('/reports/jobs', request).then(r => r.data),

  listJobs: (params?: { skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set('skip', String(params.skip));
    if (params?.limit) q.set('limit', String(params.limit));
    return client.get<{ items: ReportJob[]; total: number }>(`/reports/jobs?${q}`).then(r => r.data);
  },

  getJob: (jobId: number) =>
    client.get<ReportJob>(`/reports/jobs/${jobId}`).then(r => r.data),
};
