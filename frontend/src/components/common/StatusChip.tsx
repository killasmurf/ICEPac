import Chip from '@mui/material/Chip';
import type { Theme } from '@mui/material/styles';

export type StatusKind = 'approval' | 'active' | 'role' | 'job' | 'risk' | 'project';

type Tone = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' | 'outlined';
interface Entry {
  label: string;
  tone: Tone;
}

// Values verified against the backend (2026-11-16):
//  approval: app/models/database/wbs.py (draft|submitted|approved|rejected)
//  project:  ProjectStatus in app/models/database/project.py
//  role:     UserRole in app/models/database/user.py
//  job:      ImportStatus (import_job.py) + report job statuses (report.py: pending, generating, completed, expired, failed)
//            plus "processing" from the plan
//  risk:     free-form string in risk.py, default "open"; plan lists open|mitigated|closed
const MAP: Record<Exclude<StatusKind, 'active'>, Record<string, Entry>> = {
  approval: {
    draft: { label: 'Draft', tone: 'default' },
    submitted: { label: 'Submitted', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'error' },
  },
  role: {
    admin: { label: 'Admin', tone: 'primary' },
    manager: { label: 'Manager', tone: 'info' },
    user: { label: 'User', tone: 'default' },
    viewer: { label: 'Viewer', tone: 'outlined' },
  },
  job: {
    pending: { label: 'Pending', tone: 'default' },
    uploading: { label: 'Uploading', tone: 'info' },
    parsing: { label: 'Parsing', tone: 'info' },
    creating_records: { label: 'Creating records', tone: 'info' },
    processing: { label: 'Processing', tone: 'info' },
    generating: { label: 'Generating', tone: 'info' },
    completed: { label: 'Completed', tone: 'success' },
    failed: { label: 'Failed', tone: 'error' },
    expired: { label: 'Expired', tone: 'default' },
  },
  risk: {
    open: { label: 'Open', tone: 'warning' },
    mitigated: { label: 'Mitigated', tone: 'info' },
    closed: { label: 'Closed', tone: 'success' },
  },
  project: {
    draft: { label: 'Draft', tone: 'default' },
    importing: { label: 'Importing', tone: 'info' },
    imported: { label: 'Imported', tone: 'success' },
    import_failed: { label: 'Import failed', tone: 'error' },
    active: { label: 'Active', tone: 'success' },
    archived: { label: 'Archived', tone: 'outlined' },
  },
};

const ACTIVE: Record<'true' | 'false', Entry> = {
  true: { label: 'Active', tone: 'success' },
  false: { label: 'Inactive', tone: 'default' },
};

function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown';
}

/** Exposed for tests and for callers that only need the label. */
export function resolveStatus(kind: StatusKind, value: string | boolean | null | undefined): Entry {
  if (kind === 'active') return ACTIVE[value ? 'true' : 'false'];
  const raw = value == null ? '' : String(value);
  return MAP[kind][raw.toLowerCase()] ?? { label: humanize(raw), tone: 'default' };
}

const tint = (color: string) => `color-mix(in srgb, ${color} 12%, transparent)`;

function toneSx(tone: Tone) {
  return (theme: Theme) => {
    const p = (theme.vars ?? theme).palette;
    if (tone === 'outlined') {
      return { bgcolor: 'transparent', color: p.text.secondary, border: 1, borderColor: p.divider };
    }
    const color = tone === 'default' ? p.text.secondary : p[tone].main;
    return { bgcolor: tint(color), color, border: 0 };
  };
}

export interface StatusChipProps {
  kind: StatusKind;
  /** String enum value (case-insensitive), or boolean for `kind="active"`. Unknown values render neutral. */
  value: string | boolean | null | undefined;
  size?: 'small' | 'medium';
}

export function StatusChip({ kind, value, size = 'small' }: StatusChipProps) {
  const { label, tone } = resolveStatus(kind, value);
  return <Chip label={label} size={size} data-tone={tone} sx={toneSx(tone)} />;
}

export default StatusChip;
