import { describe, expect, it } from 'vitest';
import {
  calculate80ConfidenceInterval,
  calculatePERT,
  calculateStdDeviation,
  normalizeAssignment,
  normalizeProjectEstimation,
  normalizeRisk,
} from './estimation';

// These tests pin the current behaviour of the PERT helpers. The UI only displays them
// (live form previews); backend-supplied totals are authoritative. Do not change the
// expected numbers without changing the backend model as well.
describe('calculatePERT', () => {
  it('weights the likely value four times: (best + 4*likely + worst) / 6', () => {
    expect(calculatePERT(100, 200, 400)).toBeCloseTo(1300 / 6, 12);
    expect(calculatePERT(100, 100, 100)).toBe(100);
    expect(calculatePERT(0, 0, 0)).toBe(0);
    expect(calculatePERT(10, 10, 10)).toBe(10);
    expect(calculatePERT(60, 120, 240)).toBe(130);
  });

  it('does not validate or reorder its inputs', () => {
    expect(calculatePERT(400, 200, 100)).toBeCloseTo(1300 / 6, 12);
    expect(calculatePERT(-60, 0, 60)).toBe(0);
  });

  it('keeps fractional results unrounded', () => {
    expect(calculatePERT(1, 2, 4)).toBeCloseTo(13 / 6, 12);
    expect(calculatePERT(0.1, 0.2, 0.4)).toBeCloseTo(1.3 / 6, 12);
  });
});

describe('calculateStdDeviation', () => {
  it('is (worst - best) / 6', () => {
    expect(calculateStdDeviation(100, 400)).toBe(50);
    expect(calculateStdDeviation(0, 0)).toBe(0);
    expect(calculateStdDeviation(10, 10)).toBe(0);
  });

  it('goes negative when worst < best (no clamping)', () => {
    expect(calculateStdDeviation(400, 100)).toBe(-50);
  });
});

describe('calculate80ConfidenceInterval', () => {
  it('uses z = 1.28 either side of the PERT estimate', () => {
    const { low, high } = calculate80ConfidenceInterval(250, 50);
    expect(low).toBeCloseTo(186, 10);
    expect(high).toBeCloseTo(314, 10);
  });

  it('collapses to the PERT estimate when the deviation is zero', () => {
    expect(calculate80ConfidenceInterval(1000, 0)).toEqual({ low: 1000, high: 1000 });
  });

  it('is symmetric and not clamped at zero', () => {
    const { low, high } = calculate80ConfidenceInterval(10, 100);
    expect(low).toBeCloseTo(-118, 10);
    expect(high).toBeCloseTo(138, 10);
    expect(10 - low).toBeCloseTo(high - 10, 10);
  });

  it('composes with the other helpers for a worked example', () => {
    const pert = calculatePERT(100, 200, 400);
    const sd = calculateStdDeviation(100, 400);
    const { low, high } = calculate80ConfidenceInterval(pert, sd);
    expect(pert).toBeCloseTo(1300 / 6, 12);
    expect(sd).toBe(50);
    expect(low).toBeCloseTo(1300 / 6 - 64, 10);
    expect(high).toBeCloseTo(1300 / 6 + 64, 10);
  });
});

describe('decimal normalisers', () => {
  const rawAssignment = {
    id: 1,
    wbs_id: 2,
    resource_code: 'ENG',
    supplier_code: null,
    cost_type_code: null,
    region_code: null,
    bus_area_code: null,
    estimating_technique_code: null,
    best_estimate: '12000.00',
    likely_estimate: '15000.50',
    worst_estimate: '20000.00',
    duty_pct: '100.00',
    import_content_pct: '0.00',
    aii_pct: '0.00',
    pert_estimate: 15333.42,
    std_deviation: '1333.33',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('normalizeAssignment turns Decimal strings into numbers', () => {
    const a = normalizeAssignment(rawAssignment);
    expect(a.best_estimate).toBe(12000);
    expect(a.likely_estimate).toBe(15000.5);
    expect(a.worst_estimate).toBe(20000);
    expect(a.duty_pct).toBe(100);
    expect(a.std_deviation).toBeCloseTo(1333.33, 2);
    expect(a.pert_estimate).toBe(15333.42);
    expect(a.resource_code).toBe('ENG');
    // Summing never produces NaN
    expect(a.best_estimate + a.likely_estimate + a.worst_estimate).toBe(47000.5);
  });

  it('normalizeRisk converts cost and exposure, keeping null exposure null', () => {
    const base = {
      id: 1, wbs_id: 2, project_id: null, title: 'T', status: 'open', risk_category_code: 'TECH',
      probability_code: null, severity_code: null, mitigation_plan: null, date_identified: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    expect(normalizeRisk({ ...base, risk_cost: '10000.00', risk_exposure: 2500 }).risk_cost).toBe(10000);
    expect(normalizeRisk({ ...base, risk_cost: '10000.00', risk_exposure: null }).risk_exposure).toBeNull();
    expect(normalizeRisk({ ...base, risk_cost: null, risk_exposure: '12.5' })).toMatchObject({ risk_cost: 0, risk_exposure: 12.5 });
  });

  it('normalizeProjectEstimation converts nested breakdowns and WBS rows', () => {
    const wbs = {
      wbs_id: 1, wbs_code: '1', wbs_title: 'A', assignment_count: 2, total_pert_estimate: '100.50',
      total_std_deviation: '5', confidence_80_low: '90', confidence_80_high: '110', risk_count: 1,
      total_risk_exposure: '10', risk_adjusted_estimate: '110.50', approval_status: 'draft',
    };
    const out = normalizeProjectEstimation({
      project_id: 1, project_name: 'P', total_wbs_items: 1, total_assignments: 2, total_pert_estimate: '100.50',
      total_std_deviation: '5', confidence_80_low: '90', confidence_80_high: '110', total_risks: 1,
      total_risk_exposure: '10', risk_adjusted_estimate: '110.50',
      by_cost_type: [{ code: 'L', description: 'Labour', total_pert: '100.50', assignment_count: 2 }],
      by_region: [], by_resource: [],
      by_supplier: [{ code: 'S', name: 'Sup', total_pert: '1', assignment_count: '1' }],
      wbs_summaries: [wbs],
    });
    expect(out.total_pert_estimate).toBe(100.5);
    expect(out.by_cost_type[0].total_pert).toBe(100.5);
    expect(out.by_supplier[0].assignment_count).toBe(1);
    expect(out.wbs_summaries[0].risk_adjusted_estimate).toBe(110.5);
    expect(out.wbs_summaries[0].wbs_title).toBe('A');
  });
});
