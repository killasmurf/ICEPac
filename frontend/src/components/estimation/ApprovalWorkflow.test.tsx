import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { WBSApprovalResponse } from '../../api/estimation';
import ApprovalWorkflow from './ApprovalWorkflow';

const h = vi.hoisted(() => ({ role: 'admin' as string | null, processApproval: vi.fn() }));

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ role: h.role }) }));
vi.mock('../../api/estimation', async () => {
  const actual = await vi.importActual<typeof import('../../api/estimation')>('../../api/estimation');
  return { ...actual, processApproval: h.processApproval };
});

const status = (approval_status: string, extra: Partial<WBSApprovalResponse> = {}): WBSApprovalResponse => ({
  wbs_id: 10,
  approval_status,
  approver: null,
  approver_date: null,
  estimate_revision: 0,
  ...extra,
});

const setup = (approval: WBSApprovalResponse, canApprove?: boolean) => {
  const onStatusChange = vi.fn();
  renderWithProviders(
    <ApprovalWorkflow projectId={1} wbsId={10} approvalStatus={approval} onStatusChange={onStatusChange} canApprove={canApprove} />,
  );
  return { onStatusChange };
};

beforeEach(() => {
  h.role = 'admin';
  h.processApproval.mockReset();
});

describe('ApprovalWorkflow', () => {
  it('shows draft -> submitted -> approved steps and only a submit action for a draft', () => {
    setup(status('draft'));
    const stepper = screen.getByLabelText('Approval progress');
    expect(within(stepper).getByText('Draft')).toBeInTheDocument();
    expect(within(stepper).getByText('Submitted')).toBeInTheDocument();
    expect(within(stepper).getByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for Approval' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('submits, toasts, and reports the new status to the parent', async () => {
    const next = status('submitted');
    h.processApproval.mockResolvedValue(next);
    const { onStatusChange } = setup(status('draft'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit for Approval' }));
    expect(h.processApproval).toHaveBeenCalledWith(1, 10, { action: 'submit', comment: undefined });
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith(next));
    expect(await screen.findByText('Submitted for approval')).toBeInTheDocument();
  });

  it.each(['admin', 'manager'])('lets a %s approve a submitted estimate', async (role) => {
    h.role = role;
    h.processApproval.mockResolvedValue(status('approved', { approver: 'sam', estimate_revision: 1 }));
    const { onStatusChange } = setup(status('submitted'));
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(h.processApproval).toHaveBeenCalledWith(1, 10, { action: 'approve', comment: undefined });
    await waitFor(() => expect(onStatusChange).toHaveBeenCalled());
    expect(await screen.findByText('Estimate approved')).toBeInTheDocument();
  });

  it.each(['user', 'viewer'])('shows a waiting message instead of approve and reject for a %s', (role) => {
    h.role = role;
    setup(status('submitted'));
    expect(screen.getByText('Awaiting approval from project manager')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('lets an explicit canApprove prop override the role', () => {
    h.role = 'viewer';
    setup(status('submitted'), true);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('rejects with a comment', async () => {
    h.processApproval.mockResolvedValue(status('rejected'));
    const { onStatusChange } = setup(status('submitted'));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject Estimate' });
    await userEvent.type(within(dialog).getByLabelText('Rejection Comment'), 'Numbers look low');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(h.processApproval).toHaveBeenCalledWith(1, 10, { action: 'reject', comment: 'Numbers look low' });
    await waitFor(() => expect(onStatusChange).toHaveBeenCalled());
    expect(await screen.findByText('Estimate rejected')).toBeInTheDocument();
  });

  it('shows rejected as an error step and offers reset to draft', async () => {
    h.processApproval.mockResolvedValue(status('draft'));
    setup(status('rejected'));
    const stepper = screen.getByLabelText('Approval progress');
    expect(within(stepper).getByText('Rejected')).toBeInTheDocument();
    expect(within(stepper).getByText('Needs changes')).toBeInTheDocument();
    expect(within(stepper).queryByText('Approved')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset to Draft' }));
    expect(h.processApproval).toHaveBeenCalledWith(1, 10, { action: 'reset', comment: undefined });
  });

  it('shows the approver and locks an approved estimate', () => {
    setup(status('approved', { approver: 'sam', approver_date: '2026-03-05T00:00:00', estimate_revision: 2 }));
    expect(screen.getByText(/Approved by: sam on 05 Mar 2026/)).toBeInTheDocument();
    expect(screen.getByText('Rev 2')).toBeInTheDocument();
    expect(screen.getByText('This estimate has been approved and is locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit|Approve|Reject|Reset/ })).not.toBeInTheDocument();
  });
});
