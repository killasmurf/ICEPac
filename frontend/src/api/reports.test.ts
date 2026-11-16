import { describe, expect, it } from 'vitest';
import { fallbackFilename, filenameFromDisposition } from './reports';

describe('filenameFromDisposition', () => {
  it('reads a quoted filename', () => {
    expect(filenameFromDisposition('attachment; filename="cost-by-wbs.xlsx"', 'x.pdf')).toBe('cost-by-wbs.xlsx');
  });
  it('reads an unquoted filename', () => {
    expect(filenameFromDisposition('attachment; filename=report.csv', 'x.pdf')).toBe('report.csv');
  });
  it('prefers the RFC 5987 encoded filename', () => {
    expect(filenameFromDisposition("attachment; filename=\"a.pdf\"; filename*=UTF-8''Cost%20Report.pdf", 'x.pdf')).toBe('Cost Report.pdf');
  });
  it('falls back when the header is missing', () => {
    expect(filenameFromDisposition(undefined, 'x.pdf')).toBe('x.pdf');
    expect(filenameFromDisposition('attachment', 'x.pdf')).toBe('x.pdf');
  });
});

describe('fallbackFilename', () => {
  it('builds a dated name from the report type', () => {
    expect(fallbackFilename('cost_by_wbs', 'xlsx', new Date('2026-03-04T10:00:00Z'))).toBe('cost-by-wbs-20260304.xlsx');
  });
});
