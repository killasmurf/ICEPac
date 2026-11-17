import { describe, expect, it } from 'vitest';
import { formatActionLabel, formatAuditValue } from './auditFormat';

describe('formatAuditValue', () => {
  it('returns null for null, undefined and empty values', () => {
    expect(formatAuditValue(null)).toBeNull();
    expect(formatAuditValue(undefined)).toBeNull();
    expect(formatAuditValue('')).toBeNull();
  });

  it('pretty-prints objects with two-space indent', () => {
    expect(formatAuditValue({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('re-formats JSON strings', () => {
    expect(formatAuditValue('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it('returns text that is not valid JSON unchanged', () => {
    expect(formatAuditValue('not json {')).toBe('not json {');
  });

  it('does not throw on circular values', () => {
    const o: Record<string, unknown> = {};
    o.self = o;
    expect(typeof formatAuditValue(o)).toBe('string');
  });
});

describe('formatActionLabel', () => {
  it('humanises action codes', () => {
    expect(formatActionLabel('FAILED_LOGIN')).toBe('Failed login');
    expect(formatActionLabel('CREATE')).toBe('Create');
  });
});
