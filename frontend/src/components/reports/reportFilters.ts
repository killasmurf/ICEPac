/**
 * Which filters each report accepts (verified against app/repositories/report_repository.py)
 * and the mapping between UI/URL state and the ReportFilter sent to the API.
 */
import type { ReportFilter, ReportType } from '../../api/reports';

export type CodeFilterKey =
  | 'cost_type_codes'
  | 'region_codes'
  | 'resource_codes'
  | 'supplier_codes'
  | 'technique_codes';

export type FilterKey = 'date_from' | 'date_to' | 'approval_status' | CodeFilterKey;

export const CODE_FILTERS: { key: CodeFilterKey; param: string; label: string; placeholder: string }[] = [
  { key: 'cost_type_codes', param: 'cost_types', label: 'Cost type codes', placeholder: 'LBR, MAT' },
  { key: 'region_codes', param: 'regions', label: 'Region codes', placeholder: 'NSW, VIC' },
  { key: 'resource_codes', param: 'resources', label: 'Resource codes', placeholder: 'RES001, RES002' },
  { key: 'supplier_codes', param: 'suppliers', label: 'Supplier codes', placeholder: 'SUP01' },
  { key: 'technique_codes', param: 'techniques', label: 'Technique codes', placeholder: 'ANALOG, PARAM' },
];

/** Values as held in the UI and the URL: codes stay as the raw comma-separated text. */
export interface FilterValues {
  project_id?: number;
  date_from?: string;
  date_to?: string;
  approval_status?: string;
  cost_type_codes?: string;
  region_codes?: string;
  resource_codes?: string;
  supplier_codes?: string;
  technique_codes?: string;
}

export const APPROVAL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
] as const;

const ASSIGNMENT_FILTERS: FilterKey[] = [
  'approval_status',
  'cost_type_codes',
  'region_codes',
  'resource_codes',
  'supplier_codes',
  'technique_codes',
];

const AUDIT_TYPES: ReportType[] = ['estimator_activity', 'approver_activity', 'change_history'];
const NO_EXTRA_FILTER_TYPES: ReportType[] = ['risk_assessment', 'risk_summary', 'project_summary'];

/** Filters (besides the always-required project) the backend applies for a report. */
export function supportedFilters(type: ReportType): FilterKey[] {
  if (AUDIT_TYPES.includes(type)) return ['date_from', 'date_to'];
  if (NO_EXTRA_FILTER_TYPES.includes(type)) return [];
  return ASSIGNMENT_FILTERS;
}

export function parseCodes(text: string | undefined): string[] {
  return (text ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Drop values the selected report does not use. */
export function pruneFilters(type: ReportType, values: FilterValues): FilterValues {
  const allowed = new Set<string>(['project_id', ...supportedFilters(type)]);
  return Object.fromEntries(Object.entries(values).filter(([k, v]) => allowed.has(k) && v !== undefined && v !== '')) as FilterValues;
}

/** Error text for the date range, or null when valid. */
export function dateRangeError(values: FilterValues): string | null {
  const { date_from: from, date_to: to } = values;
  return from && to && from > to ? 'End date must be on or after the start date' : null;
}

/** Required filters are set and valid. */
export function isReady(type: ReportType | null, values: FilterValues): boolean {
  return type !== null && values.project_id !== undefined && dateRangeError(values) === null;
}

/** Build the API filter from UI values, sending only what the backend defines for this report. */
export function buildReportFilter(type: ReportType, values: FilterValues): ReportFilter | null {
  if (!isReady(type, values) || values.project_id === undefined) return null;
  const v = pruneFilters(type, values);
  const filter: ReportFilter = { project_id: values.project_id };
  if (v.date_from) filter.date_from = v.date_from;
  if (v.date_to) filter.date_to = v.date_to;
  if (v.approval_status) filter.approval_status = v.approval_status;
  for (const { key } of CODE_FILTERS) {
    const codes = parseCodes(v[key]);
    if (codes.length) filter[key] = codes;
  }
  return filter;
}

const SCALAR_PARAMS: { key: 'date_from' | 'date_to' | 'approval_status'; param: string }[] = [
  { key: 'date_from', param: 'from' },
  { key: 'date_to', param: 'to' },
  { key: 'approval_status', param: 'status' },
];

export function valuesFromParams(params: URLSearchParams): FilterValues {
  const values: FilterValues = {};
  const project = Number(params.get('project'));
  if (Number.isInteger(project) && project > 0) values.project_id = project;
  for (const { key, param } of SCALAR_PARAMS) {
    const v = params.get(param);
    if (v) values[key] = v;
  }
  for (const { key, param } of CODE_FILTERS) {
    const v = params.get(param);
    if (v) values[key] = v;
  }
  return values;
}

/** Serialise state to a query string. Only the report type and values it uses are written. */
export function paramsFromState(type: ReportType | null, values: FilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (!type) return params;
  params.set('report', type);
  const v = pruneFilters(type, values);
  if (v.project_id !== undefined) params.set('project', String(v.project_id));
  for (const { key, param } of SCALAR_PARAMS) {
    const x = v[key];
    if (x) params.set(param, x);
  }
  for (const { key, param } of CODE_FILTERS) {
    const x = v[key];
    if (x) params.set(param, x);
  }
  return params;
}
