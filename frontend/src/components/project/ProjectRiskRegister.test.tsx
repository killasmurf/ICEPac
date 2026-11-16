import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { ProjectRisk } from '../../api/project-risks';
import { ProjectRiskRegister } from './ProjectRiskRegister';

vi.setConfig({ testTimeout: 30_000 });

const h = vi.hoisted(() => ({
  role: 'manager' as string | null,
  list: vi.fn(),
  totalCost: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  listItems: vi.fn(),
}));

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ role: h.role }) }));
vi.mock('../../api/project-risks', () => ({
  projectRiskApi: { list: h.list, totalCost: h.totalCost, create: h.create, update: h.update, delete: h.del },
}));
vi.mock('../../api/admin', () => ({ configApi: { listItems: h.listItems } }));
vi.mock('../common/DataTable', async () => {
  const actual = await vi.importActual<typeof import('../common/DataTable')>('../common/DataTable');
  const Real = actual.DataTable as unknown as React.ComponentType<{ disableVirtualization?: boolean }>;
  const DataTable = ((props: object) => <Real {...props} disableVirtualization />) as unknown as typeof actual.DataTable;
  return { ...actual, DataTable, default: DataTable };
});

const risk = (over: Partial<ProjectRisk> = {}): ProjectRisk => ({
  id: 7,
  project_id: 1,
  title: 'Steel price escalation',
  status: 'open',
  risk_category_code: 'MKT',
  risk_cost: '125000.50',
  probability_code: 'H',
  severity_code: 'M',
  mitigation_plan: 'Fix price early',
  date_identified: '2026-02-03T00:00:00Z',
  risk_exposure: null,
  created_at: '2026-02-03T00:00:00Z',
  updated_at: '2026-02-03T00:00:00Z',
  ...over,
});

const config = (code: string, description: string) => ({ id: 1, code, description });

beforeEach(() => {
  [h.list, h.totalCost, h.create, h.update, h.del, h.listItems].forEach((m) => m.mockReset());
  h.role = 'manager';
  h.list.mockResolvedValue({ items: [risk(), risk({ id: 8, title: 'Permit delay', status: 'mitigated', risk_cost: '5000' })], total: 2 });
  h.totalCost.mockResolvedValue({ total_risk_cost: 130000.5 });
  h.listItems.mockImplementation((table: string) =>
    Promise.resolve({
      items:
        table === 'risk-categories'
          ? [config('MKT', 'Market')]
          : table === 'probability-levels'
            ? [config('H', 'High')]
            : [config('M', 'Medium')],
      total: 1,
      table_name: table,
    }),
  );
});

const setValue = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ProjectRiskRegister', () => {
  it('renders the total, rows, whole-dollar costs and status chips', async () => {
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    expect(await screen.findByText('Steel price escalation')).toBeInTheDocument();
    expect(h.list).toHaveBeenCalledWith(1);
    expect(screen.getByText('$130,001')).toBeInTheDocument(); // total, no cents
    expect(screen.getByText('$125,001')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Mitigated')).toBeInTheDocument();
    expect(screen.getAllByText('03 Feb 2026')).toHaveLength(2);
    expect(screen.getByText(/2 project-level risks/)).toBeInTheDocument();
  });

  it('shows a loading state, then an empty state with an add action', async () => {
    h.list.mockResolvedValue({ items: [], total: 0 });
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    expect(screen.getByRole('status', { name: 'Loading risk register' })).toBeInTheDocument();
    expect(await screen.findByText('No project-level risks recorded yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add Project Risk' }).length).toBeGreaterThan(0);
  });

  it('shows an error state and retries', async () => {
    h.list.mockRejectedValueOnce(new Error('500'));
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    expect(await screen.findByText('Could not load the risk register')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Steel price escalation')).toBeInTheDocument();
  });

  it('creates a risk with the form payload and shows a toast', async () => {
    h.create.mockResolvedValue(risk({ id: 9 }));
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    await screen.findByText('Steel price escalation');
    await userEvent.click(screen.getByRole('button', { name: 'Add Project Risk' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add Project Risk' });
    const create = within(dialog).getByRole('button', { name: 'Create Risk' });
    expect(create).toBeDisabled();
    expect(within(dialog).getByText('Title is required')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), { target: { value: 'Regulatory slip' } });
    setValue('Risk Cost', '25000');
    expect(create).toBeEnabled();
    await userEvent.click(create);
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create).toHaveBeenCalledWith(1, {
      title: 'Regulatory slip',
      risk_cost: 25000,
      risk_category_code: 'MKT',
      probability_code: 'H',
      severity_code: 'M',
      mitigation_plan: '',
      status: 'open',
    });
    expect(await screen.findByText('Project risk created')).toBeInTheDocument();
    await waitFor(() => expect(h.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('edits a risk', async () => {
    h.update.mockResolvedValue(risk());
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit risk Steel price escalation' }));
    await screen.findByRole('dialog', { name: 'Edit Project Risk' });
    expect(screen.getByLabelText('Risk Cost')).toHaveValue(125000.5);
    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), { target: { value: 'Steel price spike' } });
    setValue('Risk Cost', '-1');
    expect(screen.getByText('Must be 0 or more')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    setValue('Risk Cost', '99000');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(h.update).toHaveBeenCalledWith(
      1,
      7,
      expect.objectContaining({ title: 'Steel price spike', risk_cost: 99000, status: 'open', risk_category_code: 'MKT' }),
    );
    expect(await screen.findByText('Project risk updated')).toBeInTheDocument();
  });

  it('confirms before deleting', async () => {
    h.del.mockResolvedValue({ ok: true });
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete risk Permit delay' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete project risk?' });
    expect(h.del).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(h.del).toHaveBeenCalledWith(1, 8));
    expect(await screen.findByText('Project risk deleted')).toBeInTheDocument();
  });

  it.each(['user', 'viewer'])('is read-only for a %s (the API only lets admins and managers change risks)', async (role) => {
    h.role = role;
    renderWithProviders(<ProjectRiskRegister projectId={1} />);
    await screen.findByText('Steel price escalation');
    expect(screen.queryByRole('button', { name: 'Add Project Risk' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit risk/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete risk/ })).not.toBeInTheDocument();
  });
});
