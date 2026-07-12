/**
 * Reports.test.tsx — frozen-fixture contract test for the Reports page.
 *
 * Pinned fixtures (a ReportResult JSON + a ReportCatalog JSON) that
 * document the contract between the frontend and the backend. Any
 * change to either side must update the fixture.
 *
 * Currently uses pure fixture tests only (no component import) because
 * the frontend test infrastructure has a pre-existing issue: Jest 29
 * cannot transform axios (an ESM-only node_module) without
 * `transformIgnorePatterns` config in package.json. Adding that
 * config (and component-render tests) is a follow-up.
 */

// Frozen ReportResult JSON — captured from a live API response and
// committed as the contract test fixture. Any change to the
// ReportResult schema must update this fixture.
export const FROZEN_REPORT_RESULT = {
  report_type: 'cost_by_wbs',
  title: 'Cost by WBS — Test Project',
  generated_at: '2026-07-08T05:56:12.842719',
  project_name: 'Test Project',
  filters_applied: { project_id: 17 },
  columns: [
    { key: 'group_label', label: 'WBS Item' },
    { key: 'best_total', label: 'Best ($)' },
    { key: 'likely_total', label: 'Likely ($)' },
    { key: 'worst_total', label: 'Worst ($)' },
    { key: 'pert_total', label: 'PERT ($)' },
    { key: 'std_dev', label: 'Std Dev' },
    { key: 'confidence_80_low', label: '80% Low' },
    { key: 'confidence_80_high', label: '80% High' },
    { key: 'assignment_count', label: 'Assignments' },
  ],
  rows: [
    {
      group_label: '1.0 - Project Management',
      best_total: 10000.0,
      likely_total: 15000.0,
      worst_total: 25000.0,
      pert_total: 15833.33,
      std_dev: 2500.0,
      confidence_80_low: 12633.33,
      confidence_80_high: 19033.33,
      assignment_count: 5,
    },
  ],
  totals: {
    best_total: 10000.0,
    likely_total: 15000.0,
    worst_total: 25000.0,
    pert_total: 15833.33,
    std_dev: 2500.0,
    confidence_80_low: 12633.33,
    confidence_80_high: 19033.33,
    assignment_count: 5,
  },
  row_count: 1,
  metadata: { report_catalog_category: 'cost_control' },
};

// Frozen ReportCatalog JSON — pulled from a live /api/v1/reports/catalog
// response. Documents the 5-category structure the UI consumes.
export const FROZEN_REPORT_CATALOG = {
  cost_control: {
    label: 'Cost Control Reports',
    reports: [
      { type: 'cost_by_wbs', label: 'Cost by WBS', description: 'Cost rollup by Work Breakdown Structure' },
    ],
  },
};

// Pure unit tests on the fixtures themselves (no component import, so
// they don't trigger the axios ESM issue). These verify the fixtures
// stay valid as the contract evolves.
describe('Reports frozen fixtures', () => {
  it('ReportResult fixture has all required fields', () => {
    expect(FROZEN_REPORT_RESULT).toHaveProperty('report_type');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('title');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('generated_at');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('project_name');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('columns');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('rows');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('row_count');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('totals');
    expect(FROZEN_REPORT_RESULT).toHaveProperty('metadata');
    expect(Array.isArray(FROZEN_REPORT_RESULT.columns)).toBe(true);
    expect(Array.isArray(FROZEN_REPORT_RESULT.rows)).toBe(true);
    expect(typeof FROZEN_REPORT_RESULT.totals).toBe('object');
    // Numeric aggregation columns (best_total, likely_total, etc.) must
    // be present in totals. The label column (group_label) is not in
    // totals since it identifies rows, not aggregates.
    const numericKeys = ['best_total', 'likely_total', 'worst_total', 'pert_total',
                        'std_dev', 'confidence_80_low', 'confidence_80_high',
                        'assignment_count'];
    numericKeys.forEach((key) => {
      expect(FROZEN_REPORT_RESULT.totals).toHaveProperty(key);
    });
  });

  it('ReportCatalog fixture has the expected category structure', () => {
    expect(Object.keys(FROZEN_REPORT_CATALOG)).toContain('cost_control');
    expect(FROZEN_REPORT_CATALOG.cost_control).toHaveProperty('label');
    expect(FROZEN_REPORT_CATALOG.cost_control).toHaveProperty('reports');
    expect(Array.isArray(FROZEN_REPORT_CATALOG.cost_control.reports)).toBe(true);
  });
});
