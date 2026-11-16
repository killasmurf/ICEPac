import { describe, expect, it } from 'vitest';
import {
  buildReportFilter,
  dateRangeError,
  paramsFromState,
  parseCodes,
  pruneFilters,
  supportedFilters,
  valuesFromParams,
} from './reportFilters';

describe('supportedFilters', () => {
  it('audit reports take only dates', () => {
    expect(supportedFilters('change_history')).toEqual(['date_from', 'date_to']);
  });
  it('risk and project summary reports take no extra filters', () => {
    expect(supportedFilters('risk_summary')).toEqual([]);
    expect(supportedFilters('project_summary')).toEqual([]);
  });
  it('cost reports take status and code filters but not dates', () => {
    const f = supportedFilters('cost_by_wbs');
    expect(f).toContain('approval_status');
    expect(f).toContain('supplier_codes');
    expect(f).not.toContain('date_from');
  });
});

describe('parseCodes', () => {
  it('splits, trims and drops blanks', () => {
    expect(parseCodes(' LBR, MAT ,,SUB ')).toEqual(['LBR', 'MAT', 'SUB']);
    expect(parseCodes(undefined)).toEqual([]);
  });
});

describe('buildReportFilter', () => {
  it('returns null without a project', () => {
    expect(buildReportFilter('cost_by_wbs', {})).toBeNull();
  });
  it('returns null for an inverted date range', () => {
    expect(buildReportFilter('change_history', { project_id: 1, date_from: '2026-02-01', date_to: '2026-01-01' })).toBeNull();
    expect(dateRangeError({ date_from: '2026-02-01', date_to: '2026-01-01' })).toMatch(/End date/);
  });
  it('omits filters the report does not support', () => {
    const f = buildReportFilter('risk_assessment', { project_id: 2, approval_status: 'draft', date_from: '2026-01-01', cost_type_codes: 'LBR' });
    expect(f).toEqual({ project_id: 2 });
  });
  it('converts codes to arrays and keeps supported scalars', () => {
    const f = buildReportFilter('cost_by_resource', { project_id: 1, approval_status: 'approved', cost_type_codes: 'LBR, MAT' });
    expect(f).toEqual({ project_id: 1, approval_status: 'approved', cost_type_codes: ['LBR', 'MAT'] });
  });
  it('keeps dates for audit reports', () => {
    expect(buildReportFilter('estimator_activity', { project_id: 1, date_from: '2026-01-01' })).toEqual({ project_id: 1, date_from: '2026-01-01' });
  });
});

describe('URL round trip', () => {
  it('writes and reads the same values', () => {
    const values = { project_id: 3, approval_status: 'draft', resource_codes: 'R1, R2' };
    const params = paramsFromState('cost_by_resource', values);
    expect(params.toString()).toBe('report=cost_by_resource&project=3&status=draft&resources=R1%2C+R2');
    expect(valuesFromParams(params)).toEqual(values);
  });
  it('drops unsupported values and returns nothing without a report', () => {
    expect(paramsFromState('risk_summary', { project_id: 1, approval_status: 'draft' }).toString()).toBe('report=risk_summary&project=1');
    expect(paramsFromState(null, { project_id: 1 }).toString()).toBe('');
  });
  it('ignores a bad project param', () => {
    expect(valuesFromParams(new URLSearchParams('project=abc'))).toEqual({});
  });
  it('pruneFilters strips empty and unsupported keys', () => {
    expect(pruneFilters('project_summary', { project_id: 1, date_from: '2026-01-01', approval_status: '' })).toEqual({ project_id: 1 });
  });
});
