import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { WBSItem } from '../../api/projects';
import WBSDetailPanel from './WBSDetailPanel';
import { makeAssignment, makeRisk } from './testHelpers';

vi.setConfig({ testTimeout: 30_000 });

const h = vi.hoisted(() => ({
  role: 'admin' as string | null,
  getAssignments: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  getRisks: vi.fn(),
  createRisk: vi.fn(),
  updateRisk: vi.fn(),
  deleteRisk: vi.fn(),
  getApprovalStatus: vi.fn(),
  getWBSEstimation: vi.fn(),
  processApproval: vi.fn(),
}));

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ role: h.role }) }));
vi.mock('../../api/estimation', async () => {
  const actual = await vi.importActual<typeof import('../../api/estimation')>('../../api/estimation');
  return { ...actual, ...h };
});
vi.mock('../common/DataTable', async () => {
  const actual = await vi.importActual<typeof import('../common/DataTable')>('../common/DataTable');
  const Real = actual.DataTable as unknown as React.ComponentType<{ disableVirtualization?: boolean }>;
  const DataTable = ((props: object) => <Real {...props} disableVirtualization />) as unknown as typeof actual.DataTable;
  return { ...actual, DataTable, default: DataTable };
});

const wbs = { id: 10, project_id: 1, wbs_title: 'Foundations', wbs_code: '1.1' } as WBSItem;

const approval = (approval_status: string) => ({
  wbs_id: 10,
  approval_status,
  approver: null,
  approver_date: null,
  estimate_revision: 0,
});

const estimation = {
  wbs_id: 10,
  wbs_code: '1.1',
  wbs_title: 'Foundations',
  assignment_count: 1,
  total_pert_estimate: 216.67,
  total_std_deviation: 50,
  confidence_80_low: 152.67,
  confidence_80_high: 280.67,
  risk_count: 1,
  total_risk_exposure: 2500,
  risk_adjusted_estimate: 2716.67,
  approval_status: 'draft',
};

const lookups = {
  resources: [{ code: 'ENG', description: 'Engineer' }],
  riskCategories: [{ code: 'TECH', description: 'Technical' }],
  probabilityLevels: [{ code: 'M', description: 'Medium', weight: 0.5 }],
  severityLevels: [{ code: 'H', description: 'High', weight: 2 }],
};

const renderPanel = () =>
  renderWithProviders(<WBSDetailPanel open onClose={vi.fn()} projectId={1} wbs={wbs} {...lookups} />);

const setValue = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  Object.values(h).forEach((v) => typeof v === 'function' && 'mockReset' in v && v.mockReset());
  h.role = 'admin';
  h.getAssignments.mockResolvedValue({ items: [makeAssignment()], total: 1 });
  h.getRisks.mockResolvedValue({ items: [makeRisk()], total: 1 });
  h.getApprovalStatus.mockResolvedValue(approval('draft'));
  h.getWBSEstimation.mockResolvedValue(estimation);
});

describe('WBSDetailPanel', () => {
  it('loads assignments, risks, approval and estimation for the WBS item', async () => {
    renderPanel();
    expect(await screen.findByText('ENG')).toBeInTheDocument();
    expect(h.getAssignments).toHaveBeenCalledWith(1, 10);
    expect(h.getRisks).toHaveBeenCalledWith(1, 10);
    expect(h.getApprovalStatus).toHaveBeenCalledWith(1, 10);
    expect(h.getWBSEstimation).toHaveBeenCalledWith(1, 10);
    expect(screen.getByText('Foundations')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows the error state and retries', async () => {
    h.getAssignments.mockRejectedValueOnce(new Error('500'));
    renderPanel();
    expect(await screen.findByText('Could not load WBS details')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('ENG')).toBeInTheDocument();
  });

  it('creates an assignment with the form payload and shows a toast', async () => {
    h.createAssignment.mockResolvedValue(makeAssignment({ id: 2 }));
    renderPanel();
    await screen.findByText('ENG');
    await userEvent.click(screen.getByRole('button', { name: 'Add Assignment' }));
    const dialog = await screen.findByRole('dialog', { name: 'New Assignment' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: /Resource/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'ENG - Engineer' }));
    setValue('Best Estimate', '100');
    setValue('Likely Estimate', '200');
    setValue('Worst Estimate', '400');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(h.createAssignment).toHaveBeenCalledTimes(1));
    expect(h.createAssignment).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({ resource_code: 'ENG', best_estimate: 100, likely_estimate: 200, worst_estimate: 400 }),
    );
    expect(await screen.findByText('Assignment created')).toBeInTheDocument();
    // totals-affecting change refetches the details
    await waitFor(() => expect(h.getAssignments.mock.calls.length).toBeGreaterThan(1));
  });

  it('edits an assignment and shows a toast', async () => {
    h.updateAssignment.mockResolvedValue(makeAssignment());
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit assignment ENG' }));
    await screen.findByRole('dialog', { name: 'Edit Assignment' });
    setValue('Worst Estimate', '500');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(h.updateAssignment).toHaveBeenCalledTimes(1));
    expect(h.updateAssignment).toHaveBeenCalledWith(1, 10, 1, expect.objectContaining({ worst_estimate: 500, best_estimate: 100 }));
    expect(await screen.findByText('Assignment updated')).toBeInTheDocument();
  });

  it('confirms before deleting an assignment', async () => {
    h.deleteAssignment.mockResolvedValue(undefined);
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete assignment ENG' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete assignment?' });
    expect(h.deleteAssignment).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(h.deleteAssignment).toHaveBeenCalledWith(1, 10, 1));
    expect(await screen.findByText('Assignment deleted')).toBeInTheDocument();
  });

  it('creates, edits and deletes risks', async () => {
    h.createRisk.mockResolvedValue(makeRisk({ id: 6 }));
    h.updateRisk.mockResolvedValue(makeRisk());
    h.deleteRisk.mockResolvedValue(undefined);
    renderPanel();
    await screen.findByText('ENG');
    await userEvent.click(screen.getByRole('tab', { name: 'Risks' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Add Risk' }));
    await screen.findByRole('dialog', { name: 'New Risk' });
    await userEvent.click(screen.getByRole('combobox', { name: /Risk Category/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'TECH - Technical' }));
    setValue('Risk Cost', '4000');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(h.createRisk).toHaveBeenCalledWith(1, 10, expect.objectContaining({ risk_category_code: 'TECH', risk_cost: 4000 })));
    expect(await screen.findByText('Risk created')).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Edit risk TECH' }));
    await screen.findByRole('dialog', { name: 'Edit Risk' });
    setValue('Risk Cost', '12000');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(h.updateRisk).toHaveBeenCalledWith(1, 10, 5, expect.objectContaining({ risk_cost: 12000 })));
    // toasts are queued one at a time, so later ones wait for the earlier to hide
    expect(await screen.findByText('Risk updated', {}, { timeout: 8000 })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete risk TECH' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete risk?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(h.deleteRisk).toHaveBeenCalledWith(1, 10, 5));
    expect(await screen.findByText('Risk deleted', {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it('is read-only once submitted', async () => {
    h.getApprovalStatus.mockResolvedValue(approval('submitted'));
    renderPanel();
    await screen.findByText('ENG');
    expect(screen.queryByRole('button', { name: 'Add Assignment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit assignment/ })).not.toBeInTheDocument();
  });

  it('shows the cost summary with the 80% range bar', async () => {
    renderPanel();
    await screen.findByText('ENG');
    await userEvent.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(await screen.findByText('Risk-Adjusted Estimate')).toBeInTheDocument();
    expect(screen.getByText('$2,716.67')).toBeInTheDocument();
    expect(screen.getByText('$152.67 - $280.67')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /80% range \$152\.67 to \$280\.67/ })).toBeInTheDocument();
  });

  it('lets a manager approve from the approval tab but not a plain user', async () => {
    h.getApprovalStatus.mockResolvedValue(approval('submitted'));
    h.processApproval.mockResolvedValue(approval('approved'));
    h.role = 'manager';
    const { unmount } = renderPanel();
    await screen.findByText('ENG');
    await userEvent.click(screen.getByRole('tab', { name: 'Approval' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(h.processApproval).toHaveBeenCalledWith(1, 10, { action: 'approve', comment: undefined }));
    unmount();

    h.role = 'user';
    renderPanel();
    await screen.findByText('ENG');
    await userEvent.click(screen.getByRole('tab', { name: 'Approval' }));
    expect(await screen.findByText('Awaiting approval from project manager')).toBeInTheDocument();
  });
});
