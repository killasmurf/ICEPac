import { describe, expect, it } from 'vitest';
import { pluralise, toNumber, toNumberOr0 } from './number';

describe('toNumber', () => {
  it('parses Decimal strings and passes numbers through', () => {
    expect(toNumber('12000.00')).toBe(12000);
    expect(toNumber(' 0.5 ')).toBe(0.5);
    expect(toNumber(7)).toBe(7);
    expect(toNumber('-3')).toBe(-3);
  });
  it('returns null for missing or non-numeric input', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('  ')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(Number.NaN)).toBeNull();
    expect(toNumber('Infinity')).toBeNull();
  });
  it('toNumberOr0 falls back to zero', () => {
    expect(toNumberOr0('x')).toBe(0);
    expect(toNumberOr0('4.5')).toBe(4.5);
  });
});

describe('pluralise', () => {
  it('uses the singular only for exactly one', () => {
    expect(pluralise(1, 'assignment')).toBe('1 assignment');
    expect(pluralise(0, 'assignment')).toBe('0 assignments');
    expect(pluralise(2, 'risk')).toBe('2 risks');
    expect(pluralise(2, 'category', 'categories')).toBe('2 categories');
    expect(pluralise(1234, 'item')).toBe('1,234 items');
  });
});
