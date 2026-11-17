import { loadFixture } from './load';

const configItems = (table: string, rows: { code: string; description: string; weight?: number }[]) => ({
  items: rows.map((r, i) => ({
    id: i + 1,
    name: r.description,
    code: r.code,
    description: r.description,
    weight: r.weight,
    is_active: true,
    sort_order: i,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  })),
  total: rows.length,
  table_name: table,
});

const paged = <T>(items: T[]) => ({ items, total: items.length, skip: 0, limit: 1000 });

const wbsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const perWbs = Object.fromEntries(
  wbsIds.flatMap((id) => [
    [`GET /projects/1/wbs/${id}/assignments`, { items: [], total: 0 }],
    [`GET /projects/1/wbs/${id}/risks`, { items: [], total: 0 }],
    [
      `GET /projects/1/wbs/${id}/approval`,
      { wbs_id: id, approval_status: 'draft', approver: null, approver_date: null, estimate_revision: 1 },
    ],
    [
      `GET /projects/1/wbs/${id}/estimation`,
      {
        wbs_id: id,
        wbs_code: null,
        wbs_title: `WBS ${id}`,
        assignment_count: 0,
        total_pert_estimate: 0,
        total_std_deviation: 0,
        confidence_80_low: 0,
        confidence_80_high: 0,
        risk_count: 0,
        total_risk_exposure: 0,
        risk_adjusted_estimate: 0,
        approval_status: 'draft',
      },
    ],
  ]),
);

/** Routes for the project detail screen (pass as the second argument of mockApi). */
export const projectDetailRoutes: Record<string, unknown> = {
  'GET /projects/1/wbs/tree': () => loadFixture('project-detail-wbs-tree'),
  'GET /projects/1/estimation': () => loadFixture('project-detail-estimation'),
  // Project 2 (a draft with nothing imported) is opened by the command palette spec.
  'GET /projects/2/wbs/tree': { items: [], total: 0 },
  'GET /projects/2/estimation': {
    project_id: 2,
    project_name: 'Data Centre Fit-out',
    total_wbs_items: 0,
    total_assignments: 0,
    total_pert_estimate: 0,
    total_std_deviation: 0,
    confidence_80_low: 0,
    confidence_80_high: 0,
    total_risks: 0,
    total_risk_exposure: 0,
    risk_adjusted_estimate: 0,
    by_cost_type: [],
    by_region: [],
    by_resource: [],
    by_supplier: [],
    wbs_summaries: [],
  },
  'GET /projects/1/imports': { items: [], total: 0 },
  'GET /projects/1/risks': { items: [], total: 0 },
  'GET /projects/1/risks/total-cost': { total_risk_cost: 0 },
  'PUT /projects/1': () => ({ ...loadFixture<{ items: object[] }>('projects').items[0], project_name: 'Harbour Bridge Stage 2' }),
  'GET /admin/resources': paged([
    {
      id: 1,
      resource_code: 'ENG-01',
      description: 'Senior engineer',
      cost: 180,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]),
  'GET /admin/suppliers': paged([
    {
      id: 1,
      supplier_code: 'ACME',
      name: 'Acme Steel',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]),
  'GET /admin/config/cost-types': configItems('cost-types', [{ code: 'LAB', description: 'Labour' }]),
  'GET /admin/config/regions': configItems('regions', [{ code: 'VIC', description: 'Victoria' }]),
  'GET /admin/config/business-areas': configItems('business-areas', [{ code: 'INF', description: 'Infrastructure' }]),
  'GET /admin/config/estimating-techniques': configItems('estimating-techniques', [{ code: 'ANA', description: 'Analogous' }]),
  'GET /admin/config/risk-categories': configItems('risk-categories', [{ code: 'TECH', description: 'Technical' }]),
  'GET /admin/config/probability-levels': configItems('probability-levels', [{ code: 'M', description: 'Medium', weight: 0.5 }]),
  'GET /admin/config/severity-levels': configItems('severity-levels', [{ code: 'H', description: 'High', weight: 0.8 }]),
  ...perWbs,
};
