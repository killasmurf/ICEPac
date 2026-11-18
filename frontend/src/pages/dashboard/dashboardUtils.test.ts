import { describe, expect, it } from 'vitest';
import {
  activityTarget,
  approvedShare,
  describeAction,
  firstName,
  greetingFor,
  healthRows,
  relativeTime,
  topProjects,
  truncate,
} from './dashboardUtils';

describe('firstName', () => {
  it('uses the first word of the full name, then the username', () => {
    expect(firstName('Jordan Lee', 'jordan')).toBe('Jordan');
    expect(firstName('  Sam   Patel ', 'sam')).toBe('Sam');
    expect(firstName('', 'jordan')).toBe('jordan');
    expect(firstName(null, 'jordan')).toBe('jordan');
    expect(firstName(undefined, undefined)).toBe('');
  });
});

describe('greetingFor', () => {
  it('follows the time of day', () => {
    expect(greetingFor(new Date(2026, 10, 15, 6))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 10, 15, 11, 59))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 10, 15, 12))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 10, 15, 18))).toBe('Good evening');
  });
});

describe('approvedShare', () => {
  it('is approved over all WBS items', () => {
    expect(approvedShare({ draft: 20, submitted: 3, approved: 12, rejected: 5 })).toBeCloseTo(0.3);
    expect(approvedShare({ draft: 0, submitted: 0, approved: 4, rejected: 0 })).toBe(1);
  });
  it('is null when there are no items', () => {
    expect(approvedShare({ draft: 0, submitted: 0, approved: 0, rejected: 0 })).toBeNull();
  });
});

describe('truncate and topProjects', () => {
  it('truncates long names with an ellipsis and leaves short ones', () => {
    expect(truncate('Short', 10)).toBe('Short');
    const out = truncate('A very long project name indeed', 12);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out.endsWith('…')).toBe(true);
  });
  it('keeps the n largest estimates', () => {
    const p = (id: number, total_pert: number) => ({
      project_id: id, name: `P${id}`, status: 'active', wbs_total: 0, wbs_approved: 0, wbs_submitted: 0, total_pert, risk_count: 0,
    });
    expect(topProjects([p(1, 5), p(2, 50), p(3, 20)], 2).map((x) => x.project_id)).toEqual([2, 3]);
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  it('describes past times', () => {
    expect(relativeTime('2026-11-15T09:00:00Z', now)).toBe('3 hours ago');
    expect(relativeTime('2026-11-15T11:30:00Z', now)).toBe('30 minutes ago');
    expect(relativeTime('2026-11-14T12:00:00Z', now)).toBe('yesterday');
    expect(relativeTime('2026-11-08T12:00:00Z', now)).toBe('last week');
    expect(relativeTime('2026-08-15T12:00:00Z', now)).toBe('3 months ago');
  });
  it('says just now for very recent and handles bad input', () => {
    expect(relativeTime('2026-11-15T11:59:50Z', now)).toBe('just now');
    expect(relativeTime(null, now)).toBe('—');
    expect(relativeTime('not a date', now)).toBe('—');
  });
});

describe('healthRows', () => {
  it('makes one row per component with a status word', () => {
    const rows = healthRows({
      overall: 'degraded',
      app: { status: 'healthy', version: '1.2.0' },
      database: { status: 'unhealthy', error: 'connection refused' },
      cache: { status: 'unavailable', note: 'non-critical' },
      circuits: { auth: 'operational', help: 'operational' },
    });
    expect(rows.map((r) => [r.label, r.statusLabel, r.tone])).toEqual([
      ['Application', 'Healthy', 'success'],
      ['Database', 'Unhealthy', 'error'],
      ['Cache', 'Unavailable', 'warning'],
      ['Modules', 'Healthy', 'success'],
    ]);
    expect(rows[0].detail).toBe('Version 1.2.0');
    expect(rows[1].detail).toBe('connection refused');
  });
  it('marks the module group degraded when any module is not operational', () => {
    const [row] = healthRows({ overall: 'healthy', circuits: { auth: 'operational', help: 'down' } });
    expect(row.tone).toBe('warning');
    expect(row.statusLabel).toBe('Degraded');
  });
});

describe('describeAction', () => {
  it('maps known actions and keeps unknown ones readable', () => {
    expect(describeAction('CREATE')).toEqual({ verb: 'created', icon: 'create' });
    expect(describeAction('update').icon).toBe('update');
    expect(describeAction('FAILED_LOGIN')).toEqual({ verb: 'failed login', icon: 'other' });
    expect(activityTarget({ entity_type: 'Resource', entity_id: 45 })).toBe('Resource #45');
    expect(activityTarget({ entity_type: 'Resource', entity_id: null })).toBe('Resource');
  });
});
