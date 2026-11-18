import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { makeRisk } from './testHelpers';
import RiskList from './RiskList';

vi.setConfig({ testTimeout: 20_000 });

vi.mock('../common/DataTable', async () => {
  const actual = await vi.importActual<typeof import('../common/DataTable')>('../common/DataTable');
  const Real = actual.DataTable as unknown as React.ComponentType<{ disableVirtualization?: boolean }>;
  const DataTable = ((props: object) => <Real {...props} disableVirtualization />) as unknown as typeof actual.DataTable;
  return { ...actual, DataTable, default: DataTable };
});

const risks = [
  makeRisk({ id: 1, title: 'Tech debt', risk_category_code: 'TECH', risk_cost: 10000, risk_exposure: 2500 }),
  makeRisk({ id: 2, title: 'Late delivery', risk_category_code: 'SCHED', risk_cost: 5000, risk_exposure: 500, probability_code: null, severity_code: null, mitigation_plan: null }),
];
const noop = () => undefined;

describe('RiskList', () => {
  it('renders rows, chips and the total exposure', async () => {
    renderWithProviders(<RiskList risks={risks} onAdd={noop} onEdit={noop} onDelete={noop} />);
    expect(await screen.findByText('TECH')).toBeInTheDocument();
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    const totals = screen.getByRole('group', { name: 'Risk totals' });
    expect(within(totals).getByText('Total Risk Exposure (2 risks)')).toBeInTheDocument();
    expect(within(totals).getByText('$3,000.00')).toBeInTheDocument();
  });

  it('shows an empty state with an add action', async () => {
    const onAdd = vi.fn();
    renderWithProviders(<RiskList risks={[]} onAdd={onAdd} onEdit={noop} onDelete={noop} />);
    expect(await screen.findByText('No risks registered yet')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Add Risk' });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onAdd).toHaveBeenCalled();
  });

  it('calls onEdit / onDelete and honours readonly', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { unmount } = renderWithProviders(<RiskList risks={risks} onAdd={noop} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit risk Late delivery' }));
    expect(onEdit).toHaveBeenCalledWith(risks[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete risk Tech debt' }));
    expect(onDelete).toHaveBeenCalledWith(risks[0]);
    unmount();

    renderWithProviders(<RiskList risks={risks} onAdd={noop} onEdit={noop} onDelete={noop} readonly />);
    await screen.findByText('TECH');
    expect(screen.queryByRole('button', { name: /Edit risk/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Risk' })).not.toBeInTheDocument();
  });
});
