import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { ProjectEstimationSummary } from '../../api/estimation';
import EstimationSummary from './EstimationSummary';

vi.setConfig({ testTimeout: 20_000 });

const h = vi.hoisted(() => ({ getProjectEstimation: vi.fn() }));

vi.mock('../../api/estimation', async () => {
  const actual = await vi.importActual<typeof import('../../api/estimation')>('../../api/estimation');
  return { ...actual, getProjectEstimation: h.getProjectEstimation };
});
vi.mock('../common/DataTable', async () => {
  const actual = await vi.importActual<typeof import('../common/DataTable')>('../common/DataTable');
  const Real = actual.DataTable as unknown as React.ComponentType<{ disableVirtualization?: boolean }>;
  const DataTable = ((props: object) => <Real {...props} disableVirtualization />) as unknown as typeof actual.DataTable;
  return { ...actual, DataTable, default: DataTable };
});

const summary: ProjectEstimationSummary = {
  project_id: 1,
  project_name: 'Harbour Bridge',
  total_wbs_items: 2,
  total_assignments: 3,
  total_pert_estimate: 1250000,
  total_std_deviation: 50000,
  confidence_80_low: 1186000,
  confidence_80_high: 1314000,
  total_risks: 2,
  total_risk_exposure: 75000,
  risk_adjusted_estimate: 1325000,
  by_cost_type: [{ code: 'LAB', description: 'Labour', total_pert: 800000, assignment_count: 2 }],
  by_region: [],
  by_resource: [],
  by_supplier: [{ code: 'ACME', name: 'Acme Pty Ltd', total_pert: 450000, assignment_count: 1 }],
  wbs_summaries: [
    {
      wbs_id: 11,
      wbs_code: '1.1',
      wbs_title: 'Foundations',
      assignment_count: 2,
      total_pert_estimate: 700000,
      total_std_deviation: 10000,
      confidence_80_low: 687200,
      confidence_80_high: 712800,
      risk_count: 1,
      total_risk_exposure: 25000,
      risk_adjusted_estimate: 725000,
      approval_status: 'approved',
    },
    {
      wbs_id: 12,
      wbs_code: null,
      wbs_title: 'Deck',
      assignment_count: 1,
      total_pert_estimate: 550000,
      total_std_deviation: 20000,
      confidence_80_low: 524400,
      confidence_80_high: 575600,
      risk_count: 1,
      total_risk_exposure: 50000,
      risk_adjusted_estimate: 600000,
      approval_status: 'rejected',
    },
  ],
};

beforeEach(() => h.getProjectEstimation.mockReset());

describe('EstimationSummary', () => {
  it('shows stat cards, the 80% range with a range bar, and the WBS table with status chips', async () => {
    h.getProjectEstimation.mockResolvedValue(summary);
    renderWithProviders(<EstimationSummary projectId={1} />);

    expect(await screen.findByText('Total PERT Estimate')).toBeInTheDocument();
    expect(h.getProjectEstimation).toHaveBeenCalledWith(1);
    expect(screen.getAllByText('$1.3M')).toHaveLength(2); // PERT and risk-adjusted
    expect(screen.getByText(/\$1,250,000\.00 across 3 assignments/)).toBeInTheDocument();
    expect(screen.getByText(/\$75,000\.00 from 2 risks/)).toBeInTheDocument();
    expect(screen.getByText('$1,186,000.00 to $1,314,000.00')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /80% range \$1,186,000\.00 to \$1,314,000\.00/ })).toBeInTheDocument();

    const wbs = screen.getByRole('grid', { name: 'WBS cost summary' });
    expect(within(wbs).getByText('Foundations')).toBeInTheDocument();
    expect(within(wbs).getByText('Approved')).toBeInTheDocument();
    expect(within(wbs).getByText('Rejected')).toBeInTheDocument();
    expect(within(wbs).getByText('$700,000.00')).toBeInTheDocument();
    expect(within(wbs).getByText('-')).toBeInTheDocument();
  });

  it('switches breakdown tabs', async () => {
    h.getProjectEstimation.mockResolvedValue(summary);
    renderWithProviders(<EstimationSummary projectId={1} />);
    expect(await screen.findByText('Labour')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'By Region' }));
    expect(await screen.findByText('No data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'By Supplier' }));
    expect(await screen.findByText('Acme Pty Ltd')).toBeInTheDocument();
    expect(screen.getByText('$450,000.00')).toBeInTheDocument();
  });

  it('shows a loading state then an empty state when there is nothing to estimate', async () => {
    h.getProjectEstimation.mockResolvedValue({ ...summary, total_wbs_items: 0, total_assignments: 0, wbs_summaries: [] });
    renderWithProviders(<EstimationSummary projectId={1} />);
    expect(screen.getByRole('status', { name: 'Loading estimation summary' })).toBeInTheDocument();
    expect(await screen.findByText('No estimation data yet')).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    h.getProjectEstimation.mockRejectedValueOnce(new Error('500')).mockResolvedValue(summary);
    renderWithProviders(<EstimationSummary projectId={1} />);
    expect(await screen.findByText('Could not load the estimation summary')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Total PERT Estimate')).toBeInTheDocument();
    expect(h.getProjectEstimation).toHaveBeenCalledTimes(2);
  });
});
