import { describe, expect, it } from 'vitest';
import {
  currencySymbol,
  parseAmount,
  rankBreakdown,
  summaryRangeBar,
  topWbsByEstimate,
  validateMoney,
  validatePercent,
  validateThreePoint,
} from './estimationUtils';

describe('currencySymbol', () => {
  it('comes from the shared formatter (AUD by default)', () => {
    expect(currencySymbol()).toBe('$');
  });
});

describe('parseAmount', () => {
  it('parses numbers and numeric text', () => {
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount(' 7 ')).toBe(7);
    expect(parseAmount(0)).toBe(0);
  });
  it('returns null for empty or invalid input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('  ')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount(Number.NaN)).toBeNull();
  });
});

describe('validateThreePoint', () => {
  it('accepts best <= likely <= worst, including equal values and zeros', () => {
    expect(validateThreePoint({ best: '100', likely: '200', worst: '400' })).toEqual({});
    expect(validateThreePoint({ best: 5, likely: 5, worst: 5 })).toEqual({});
    expect(validateThreePoint({ best: '0', likely: '0', worst: '0' })).toEqual({});
  });

  it('flags best above likely on the best field', () => {
    expect(validateThreePoint({ best: '300', likely: '200', worst: '400' })).toEqual({
      best: 'Best must not be more than likely',
    });
  });

  it('flags likely above worst on the worst field', () => {
    expect(validateThreePoint({ best: '100', likely: '500', worst: '400' })).toEqual({
      worst: 'Worst must not be less than likely',
    });
  });

  it('flags negative and missing values', () => {
    expect(validateThreePoint({ best: '-1', likely: '2', worst: '3' }).best).toBe('Must be 0 or more');
    expect(validateThreePoint({ best: '1', likely: '', worst: '3' }).likely).toBe('Enter an amount');
    expect(validateThreePoint({ best: 'x', likely: '2', worst: '3' }).best).toBe('Enter an amount');
  });

  it('still catches best above worst when likely is missing', () => {
    expect(validateThreePoint({ best: '9', likely: '', worst: '3' })).toEqual({
      likely: 'Enter an amount',
      worst: 'Worst must not be less than best',
    });
  });
});

describe('validatePercent / validateMoney', () => {
  it('bounds percentages to 0-100', () => {
    expect(validatePercent('0')).toBeUndefined();
    expect(validatePercent('100')).toBeUndefined();
    expect(validatePercent('100.1')).toBe('Must be between 0 and 100');
    expect(validatePercent('-1')).toBe('Must be between 0 and 100');
    expect(validatePercent('')).toBe('Enter a percentage');
  });
  it('requires non-negative money', () => {
    expect(validateMoney('0')).toBeUndefined();
    expect(validateMoney('1500.25')).toBeUndefined();
    expect(validateMoney('-0.01')).toBe('Must be 0 or more');
    expect(validateMoney('')).toBe('Enter an amount');
  });
});

describe('summaryRangeBar', () => {
  const base = { total_pert_estimate: 1000, total_std_deviation: 50, confidence_80_low: 936, confidence_80_high: 1064 };

  it('spans three standard deviations either side and passes the backend figures through unchanged', () => {
    expect(summaryRangeBar(base)).toEqual({
      best: 850,
      likely: 1000,
      worst: 1150,
      pert: 1000,
      low80: 936,
      high80: 1064,
    });
  });

  it('never starts below zero', () => {
    expect(summaryRangeBar({ ...base, total_pert_estimate: 100, total_std_deviation: 50 }).best).toBe(0);
  });

  it('collapses to a point when the deviation is zero', () => {
    const r = summaryRangeBar({ ...base, total_std_deviation: 0 });
    expect(r.best).toBe(r.worst);
  });
});

describe('rankBreakdown', () => {
  const item = (code: string, total_pert: number) => ({ code, name: code, total_pert, assignment_count: 1 });

  it('sorts descending and the shares sum to 100', () => {
    const { rows, total, empty } = rankBreakdown([item('B', 200), item('A', 500), item('C', 300)]);
    expect(rows.map((r) => r.code)).toEqual(['A', 'C', 'B']);
    expect(rows.map((r) => r.share)).toEqual([50, 30, 20]);
    expect(total).toBe(1000);
    expect(empty).toBe(false);
  });

  it('sums to 100 when the maths does not divide evenly', () => {
    const { rows } = rankBreakdown([item('A', 1), item('B', 1), item('C', 1)]);
    const sum = rows.reduce((s, r) => s + r.share, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(1);
    expect(sum).toBeCloseTo(100, 5);
  });

  it('groups the tail into Other beyond maxRows and keeps the total', () => {
    const items = Array.from({ length: 10 }, (_, i) => item(`R${i}`, 100 - i));
    const { rows, total } = rankBreakdown(items, 4);
    expect(rows).toHaveLength(4);
    expect(rows[3]).toMatchObject({ name: 'Other (7)', isOther: true });
    expect(total).toBe(items.reduce((s, r) => s + r.total_pert, 0));
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(100, 5);
  });

  it('handles an all-zero or empty breakdown without dividing by zero', () => {
    const zero = rankBreakdown([item('A', 0), item('B', 0)]);
    expect(zero.empty).toBe(true);
    expect(zero.rows.every((r) => r.share === 0)).toBe(true);
    expect(rankBreakdown([]).empty).toBe(true);
  });

  it('treats negative and non-finite totals as zero', () => {
    const { rows } = rankBreakdown([item('A', -50), item('B', Number.NaN), item('C', 10)]);
    expect(rows[0]).toMatchObject({ code: 'C', share: 100 });
  });
});

describe('topWbsByEstimate', () => {
  it('returns the n largest', () => {
    const items = [{ total_pert_estimate: 1 }, { total_pert_estimate: 9 }, { total_pert_estimate: 5 }];
    expect(topWbsByEstimate(items, 2).map((i) => i.total_pert_estimate)).toEqual([9, 5]);
  });
});
