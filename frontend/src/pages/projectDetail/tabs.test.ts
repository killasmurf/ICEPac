import { describe, expect, it } from 'vitest';
import { DEFAULT_TAB, parseTab, parseWbsId, pertByWbsId } from './tabs';

describe('parseTab', () => {
  it('accepts the four known tabs', () => {
    for (const t of ['wbs', 'summary', 'risks', 'imports']) expect(parseTab(t)).toBe(t);
  });
  it('falls back to the default for missing or unknown values', () => {
    expect(parseTab(null)).toBe(DEFAULT_TAB);
    expect(parseTab('')).toBe(DEFAULT_TAB);
    expect(parseTab('overview')).toBe(DEFAULT_TAB);
    expect(parseTab('WBS')).toBe(DEFAULT_TAB);
  });
});

describe('parseWbsId', () => {
  it('parses positive integers only', () => {
    expect(parseWbsId('12')).toBe(12);
    expect(parseWbsId('0')).toBeNull();
    expect(parseWbsId('-3')).toBeNull();
    expect(parseWbsId('1.5')).toBeNull();
    expect(parseWbsId('abc')).toBeNull();
    expect(parseWbsId(null)).toBeNull();
  });
});

describe('pertByWbsId', () => {
  it('indexes totals by WBS id', () => {
    expect(pertByWbsId([{ wbs_id: 3, total_pert_estimate: 10 }, { wbs_id: 5, total_pert_estimate: 0 }])).toEqual({ 3: 10, 5: 0 });
    expect(pertByWbsId(undefined)).toEqual({});
  });
});
