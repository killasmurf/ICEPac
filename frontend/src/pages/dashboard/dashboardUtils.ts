import type { ApprovalTotals, HealthStatus, PortfolioProject, RecentActivity } from '../../api/dashboard';

const LOCALE = import.meta.env.VITE_LOCALE ?? 'en-AU';

/** First word of the full name, falling back to the username, then to nothing. */
export function firstName(fullName: string | null | undefined, username?: string | null): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || username?.trim() || '';
}

/** "Good morning" before noon, "Good afternoon" before 18:00, otherwise "Good evening" (local clock). */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const approvalTotal = (t: ApprovalTotals): number => t.draft + t.submitted + t.approved + t.rejected;

/** Approved items as a 0-1 share of all WBS items; null when there are none. */
export function approvedShare(t: ApprovalTotals): number | null {
  const total = approvalTotal(t);
  return total > 0 ? t.approved / total : null;
}

/** Truncate to `max` characters, ending with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/** The `n` projects with the largest estimate (the API already sorts, this keeps it true if it does not). */
export function topProjects(projects: PortfolioProject[], n = 10): PortfolioProject[] {
  return [...projects].sort((a, b) => b.total_pert - a.total_pert).slice(0, n);
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago", "yesterday", "just now". Returns an em dash for a missing or invalid date. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const seconds = Math.round((then - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), 'minute');
}

export type HealthTone = 'success' | 'warning' | 'error' | 'neutral';

export interface HealthRow {
  key: string;
  label: string;
  /** Word shown next to the dot. */
  statusLabel: string;
  tone: HealthTone;
  detail?: string;
}

const COMPONENT_LABELS: Record<string, string> = {
  app: 'Application',
  database: 'Database',
  cache: 'Cache',
  storage: 'File storage',
  java: 'Java runtime',
  circuits: 'Modules',
};

const toneFor = (status: string): HealthTone => {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'operational':
      return 'success';
    case 'unavailable':
    case 'degraded':
      return 'warning';
    case 'unhealthy':
    case 'down':
    case 'failed':
      return 'error';
    default:
      return 'neutral';
  }
};

const statusWord = (status: string): string => {
  const word = status.toLowerCase() === 'operational' ? 'healthy' : status.toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
};

const humanise = (key: string) => {
  const spaced = key.replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * One row per component the endpoint reports. A component is an object with a `status` string;
 * a map of name to status word (the `circuits` block) becomes a single row that is healthy only if all entries are.
 */
export function healthRows(health: HealthStatus): HealthRow[] {
  const rows: HealthRow[] = [];
  for (const [key, value] of Object.entries(health)) {
    if (key === 'overall' || !isRecord(value)) continue;
    const label = COMPONENT_LABELS[key] ?? humanise(key);
    if (typeof value.status === 'string') {
      const detail =
        (typeof value.error === 'string' && value.error) ||
        (typeof value.note === 'string' && value.note) ||
        (typeof value.version === 'string' && `Version ${value.version}`) ||
        undefined;
      rows.push({ key, label, statusLabel: statusWord(value.status), tone: toneFor(value.status), detail });
      continue;
    }
    const entries = Object.values(value).filter((v): v is string => typeof v === 'string');
    if (entries.length === 0) continue;
    const allOk = entries.every((v) => toneFor(v) === 'success');
    rows.push({
      key,
      label,
      statusLabel: allOk ? 'Healthy' : 'Degraded',
      tone: allOk ? 'success' : 'warning',
      detail: `${entries.length} modules`,
    });
  }
  return rows;
}

export interface ActivityDescription {
  verb: string;
  icon: 'create' | 'update' | 'delete' | 'other';
}

/** Map an audit-log action to a sentence verb and an icon family. Unknown actions are shown as written. */
export function describeAction(action: string): ActivityDescription {
  switch (action.toUpperCase()) {
    case 'CREATE':
      return { verb: 'created', icon: 'create' };
    case 'UPDATE':
      return { verb: 'updated', icon: 'update' };
    case 'DELETE':
      return { verb: 'deleted', icon: 'delete' };
    default:
      return { verb: action.replace(/[_-]+/g, ' ').toLowerCase(), icon: 'other' };
  }
}

export const activityTarget = (a: Pick<RecentActivity, 'entity_type' | 'entity_id'>): string =>
  a.entity_id == null ? a.entity_type : `${a.entity_type} #${a.entity_id}`;
