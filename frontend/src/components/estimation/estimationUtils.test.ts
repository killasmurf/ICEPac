import { describe, expect, it } from 'vitest';
import {
  currencySymbol,
  parseAmount,
  summaryRangeBar,
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
