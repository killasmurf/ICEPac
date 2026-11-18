import { formatCurrency, formatNumber, formatPercent, formatDate, formatDateTime, parseApiDate } from './format';

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
    expect(formatDate('2026-03-05T00:00:00')).toMatch(/05 Mar 2026/);
    expect(formatDateTime('2026-03-05T12:00:00Z')).toMatch(/2026/);
  });
});

describe('parseApiDate', () => {
  it('reads a zone-less API timestamp as UTC', () => {
    expect(parseApiDate('2026-11-18T05:50:35.909975')?.toISOString()).toBe('2026-11-18T05:50:35.909Z');
  });
  it('keeps an explicit zone', () => {
    expect(parseApiDate('2026-11-18T05:50:35+11:00')?.toISOString()).toBe('2026-11-17T18:50:35.000Z');
    expect(parseApiDate('2026-11-18T05:50:35Z')?.toISOString()).toBe('2026-11-18T05:50:35.000Z');
  });
  it('keeps calendar dates on the same local day', () => {
    for (const v of ['2026-01-05', '2026-01-05T00:00:00', '2026-01-05T00:00:00.000']) {
      const d = parseApiDate(v);
      expect([d?.getFullYear(), d?.getMonth(), d?.getDate()]).toEqual([2026, 0, 5]);
    }
  });
  it('returns null for missing or invalid input', () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate('not a date')).toBeNull();
  });
});
