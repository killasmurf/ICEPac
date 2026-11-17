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
  it('accepts a language tag and ignores the charset label case', () => {
    expect(filenameFromDisposition("attachment; filename*=utf-8'en'Q1%20Costs%20%E2%82%AC.xlsx", 'x.pdf')).toBe('Q1 Costs €.xlsx');
  });
  it('keeps semicolons and spaces inside a quoted filename', () => {
    expect(filenameFromDisposition('attachment; filename="a; b report.pdf"', 'x.pdf')).toBe('a; b report.pdf');
  });
  it('falls back to the plain filename when the encoded one is malformed', () => {
    expect(filenameFromDisposition("attachment; filename=\"ok.pdf\"; filename*=UTF-8''%E0%A4%A", 'x.pdf')).toBe('ok.pdf');
  });
  it('strips directory parts', () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"', 'x.pdf')).toBe('passwd');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''..%2F..%2Fevil.sh", 'x.pdf')).toBe('evil.sh');
  });
  it('does not mistake a longer parameter name for filename', () => {
    expect(filenameFromDisposition('attachment; xfilename=bad.pdf', 'x.pdf')).toBe('x.pdf');
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
