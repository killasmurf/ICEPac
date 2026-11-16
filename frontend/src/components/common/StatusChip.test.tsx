import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { StatusChip, resolveStatus, type StatusKind } from './StatusChip';

const cases: Array<[StatusKind, string | boolean, string, string]> = [
  ['approval', 'draft', 'Draft', 'default'],
  ['approval', 'submitted', 'Submitted', 'warning'],
  ['approval', 'approved', 'Approved', 'success'],
  ['approval', 'rejected', 'Rejected', 'error'],
  ['active', true, 'Active', 'success'],
  ['active', false, 'Inactive', 'default'],
  ['role', 'admin', 'Admin', 'primary'],
  ['role', 'manager', 'Manager', 'info'],
  ['role', 'user', 'User', 'default'],
  ['role', 'viewer', 'Viewer', 'outlined'],
  ['job', 'pending', 'Pending', 'default'],
  ['job', 'uploading', 'Uploading', 'info'],
  ['job', 'parsing', 'Parsing', 'info'],
  ['job', 'creating_records', 'Creating records', 'info'],
  ['job', 'processing', 'Processing', 'info'],
  ['job', 'generating', 'Generating', 'info'],
  ['job', 'completed', 'Completed', 'success'],
  ['job', 'failed', 'Failed', 'error'],
  ['job', 'expired', 'Expired', 'default'],
  ['risk', 'open', 'Open', 'warning'],
  ['risk', 'mitigated', 'Mitigated', 'info'],
  ['risk', 'closed', 'Closed', 'success'],
  ['project', 'draft', 'Draft', 'default'],
  ['project', 'importing', 'Importing', 'info'],
  ['project', 'imported', 'Imported', 'success'],
  ['project', 'import_failed', 'Import failed', 'error'],
  ['project', 'active', 'Active', 'success'],
  ['project', 'archived', 'Archived', 'outlined'],
];

describe('StatusChip', () => {
  it.each(cases)('%s %s -> %s (%s)', (kind, value, label, tone) => {
    renderWithProviders(<StatusChip kind={kind} value={value} />);
    const chip = screen.getByText(label).closest('.MuiChip-root');
    expect(chip).toHaveAttribute('data-tone', tone);
  });

  it('is case-insensitive', () => {
    expect(resolveStatus('approval', 'APPROVED').label).toBe('Approved');
  });

  it('falls back to a neutral humanised label for unknown values', () => {
    expect(resolveStatus('job', 'waiting_on_disk')).toEqual({ label: 'Waiting on disk', tone: 'default' });
    expect(resolveStatus('risk', null)).toEqual({ label: 'Unknown', tone: 'default' });
  });

  it('renders without a theme provider crash path for unknown values', () => {
    renderWithProviders(<StatusChip kind="project" value="weird" />);
    expect(screen.getByText('Weird')).toBeInTheDocument();
  });
});
