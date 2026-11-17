import { loadFixture } from './load';

const now = '2026-03-01T00:00:00Z';

const item = (id: number, code: string, description: string, weight?: number) => ({
  id, code, name: description, description, weight, is_active: true, sort_order: id, created_at: now, updated_at: now,
});

const configList = (table: string, items: unknown[]) => ({ items, total: items.length, table_name: table });

const wbsNode = {
  id: 11, project_id: 1, task_unique_id: 1, wbs_code: '1.1', wbs_title: 'Foundations', outline_level: 1, parent_id: null,
  schedule_start: null, schedule_finish: null, baseline_start: null, baseline_finish: null, late_start: null, late_finish: null,
  actual_start: null, actual_finish: null, duration: null, duration_units: null, percent_complete: 0, cost: null, baseline_cost: null,
  is_milestone: false, is_summary: false, is_critical: false, resource_names: null, notes: null, requirements: null, assumptions: null,
  approver: null, approver_date: null, estimate_revision: 0, approval_status: 'draft', created_at: now, updated_at: now, children: [],
};

export const assignment = {
  id: 1, wbs_id: 11, resource_code: 'ENG', supplier_code: 'ACME', cost_type_code: null, region_code: null, bus_area_code: null,
  estimating_technique_code: null, best_estimate: 100, likely_estimate: 200, worst_estimate: 400, duty_pct: 0,
  import_content_pct: 0, aii_pct: 0, pert_estimate: 216.67, std_deviation: 50, created_at: now, updated_at: now,
};

export const wbsRisk = {
  id: 5, wbs_id: 11, risk_category_code: 'TECH', risk_cost: 10000, probability_code: 'M', severity_code: 'H',
  mitigation_plan: 'Add a spike', risk_exposure: 2500, created_at: now, updated_at: now,
};

export const projectRisk = {
  id: 7, project_id: 1, title: 'Steel price escalation', status: 'open', risk_category_code: 'TECH', risk_cost: '125000.50',
  probability_code: 'M', severity_code: 'H', mitigation_plan: 'Fix price early', date_identified: '2026-02-03T00:00:00Z',
  risk_exposure: null, created_at: now, updated_at: now,
};

/** Superset of what the project detail page and its estimation components request. */
export const estimationRoutes: Record<string, unknown> = {
  'GET /projects/1/estimation': () => loadFixture('estimation-summary'),
  'GET /projects/1/risks': { items: [projectRisk], total: 1 },
  'GET /projects/1/risks/total-cost': { total_risk_cost: 125000.5 },
  'POST /projects/1/risks': { ...projectRisk, id: 8 },
  'PUT /projects/1/risks/7': projectRisk,
  'DELETE /projects/1/risks/7': { ok: true },
  'GET /projects/1/wbs/tree': { items: [wbsNode], total: 1 },
  'GET /projects/1/wbs/11/assignments': { items: [assignment], total: 1 },
  'POST /projects/1/wbs/11/assignments': { ...assignment, id: 2 },
  'PUT /projects/1/wbs/11/assignments/1': assignment,
  'DELETE /projects/1/wbs/11/assignments/1': {},
  'GET /projects/1/wbs/11/risks': { items: [wbsRisk], total: 1 },
  'GET /projects/1/wbs/11/approval': { wbs_id: 11, approval_status: 'draft', approver: null, approver_date: null, estimate_revision: 0 },
  'GET /projects/1/wbs/11/estimation': {
    wbs_id: 11, wbs_code: '1.1', wbs_title: 'Foundations', assignment_count: 1, total_pert_estimate: 216.67, total_std_deviation: 50,
    confidence_80_low: 152.67, confidence_80_high: 280.67, risk_count: 1, total_risk_exposure: 2500, risk_adjusted_estimate: 2716.67,
    approval_status: 'draft',
  },
  'GET /admin/resources': { items: [{ id: 1, resource_code: 'ENG', description: 'Engineer', cost: 100, is_active: true, created_at: now, updated_at: now }], total: 1, skip: 0, limit: 1000 },
  'GET /admin/suppliers': { items: [{ id: 1, supplier_code: 'ACME', name: 'Acme Pty Ltd', is_active: true, created_at: now, updated_at: now }], total: 1, skip: 0, limit: 1000 },
  'GET /admin/config/cost-types': configList('cost-types', [item(1, 'LAB', 'Labour')]),
  'GET /admin/config/regions': configList('regions', [item(2, 'VIC', 'Victoria')]),
  'GET /admin/config/business-areas': configList('business-areas', [item(3, 'ENG', 'Engineering')]),
  'GET /admin/config/estimating-techniques': configList('estimating-techniques', [item(4, 'ANA', 'Analogous')]),
  'GET /admin/config/risk-categories': configList('risk-categories', [item(5, 'TECH', 'Technical')]),
  'GET /admin/config/probability-levels': configList('probability-levels', [item(6, 'M', 'Medium', 0.5)]),
  'GET /admin/config/severity-levels': configList('severity-levels', [item(7, 'H', 'High', 2)]),
};
