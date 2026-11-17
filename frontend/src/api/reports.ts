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

export type ReportRow = Record<string, unknown>;

export interface ReportResult {
  report_type: string;
  title: string;
  generated_at: string;
  project_name: string;
  filters_applied: Record<string, unknown>;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow | null;
  row_count: number;
  metadata?: Record<string, unknown> | null;
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

export interface ExportedFile {
  blob: Blob;
  filename: string;
}

/** Drop any directory part so a server-supplied name cannot point outside the downloads folder. */
const baseName = (name: string) => name.split(/[\\/]/).pop()?.trim() ?? '';

/**
 * Extract the filename from a Content-Disposition header, or return the fallback.
 * Handles `filename="x.pdf"`, `filename=x.pdf` and the RFC 5987 form `filename*=UTF-8''x%20y.pdf`
 * (optionally with a language tag), which wins when both are present.
 */
export function filenameFromDisposition(header: string | undefined | null, fallback: string): string {
  if (!header) return fallback;
  const encoded = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (encoded) {
    try {
      const name = baseName(decodeURIComponent(encoded[2].trim().replace(/^"|"$/g, '')));
      if (name) return name;
    } catch {
      /* malformed percent-encoding: fall through to the plain filename */
    }
  }
  const plain = /(?:^|[;\s])filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(header);
  const name = plain ? baseName((plain[1] ?? plain[2]).trim()) : '';
  return name || fallback;
}

/** Filename used when the browser cannot read Content-Disposition (cross-origin without expose headers). */
export function fallbackFilename(reportType: string, format: ExportFormat, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `${reportType.replace(/_/g, '-')}-${stamp}.${format}`;
}

/** Trigger a browser download for a blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── API Functions ────────────────────────────────────────────

export const reportsApi = {
  getCatalog: () =>
    client.get<ReportCatalog>('/reports/catalog').then(r => r.data),

  getTypes: () =>
    client.get<{ value: string; label: string }[]>('/reports/types').then(r => r.data),

  generate: (request: ReportRequest) =>
    client.post<ReportResult>('/reports/generate', request).then(r => r.data),

  /** Generate and download the report file; returns the blob and the filename the server (or fallback) chose. */
  export: async (request: ReportRequest): Promise<ExportedFile> => {
    const resp = await client.post<Blob>('/reports/export', request, { responseType: 'blob' });
    const format = request.export_format ?? 'pdf';
    const filename = filenameFromDisposition(
      resp.headers['content-disposition'] as string | undefined,
      fallbackFilename(request.report_type, format),
    );
    return { blob: new Blob([resp.data]), filename };
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
