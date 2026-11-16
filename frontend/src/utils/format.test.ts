import { formatCurrency, formatNumber, formatPercent, formatDate, formatDateTime } from './format';

describe('format', () => {
  it('returns an em dash for null and undefined', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatNumber(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });

  it('formats a normal currency value', () => {
    expect(formatCurrency(1234.5)).toMatch(/\$1,234\.50/);
  });

  it('formats compact currency', () => {
    expect(formatCurrency(1_500_000, { compact: true })).toMatch(/\$1\.5M/);
  });

  it('formats numbers, percentages and dates in en-AU', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatPercent(0.256, 1)).toBe('25.6%');
    expect(formatDate('2026-03-05T12:00:00Z')).toMatch(/05 Mar 2026/);
    expect(formatDateTime('2026-03-05T12:00:00Z')).toMatch(/2026/);
  });
});
