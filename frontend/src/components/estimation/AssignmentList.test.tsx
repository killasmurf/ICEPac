import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { makeAssignment } from './testHelpers';
import AssignmentList from './AssignmentList';

vi.setConfig({ testTimeout: 20_000 });

vi.mock('../common/DataTable', async () => {
  const actual = await vi.importActual<typeof import('../common/DataTable')>('../common/DataTable');
  const DataTable = ((props: object) => <actual.DataTable {...(props as never)} disableVirtualization />) as typeof actual.DataTable;
  return { ...actual, DataTable, default: DataTable };
});

const rows = [
  makeAssignment({ id: 1, resource_code: 'ENG', best_estimate: 100, likely_estimate: 200, worst_estimate: 400, pert_estimate: 1300 / 6, std_deviation: 50 }),
  makeAssignment({ id: 2, resource_code: 'PM', supplier_code: null, best_estimate: 1000, likely_estimate: 1000, worst_estimate: 1000, pert_estimate: 1000, std_deviation: 0 }),
];

const noop = () => undefined;

describe('AssignmentList', () => {
  it('renders a row per assignment with formatted money and a Range column', async () => {
    renderWithProviders(<AssignmentList assignments={rows} onAdd={noop} onEdit={noop} onDelete={noop} />);
    expect(await screen.findByText('ENG')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /range/i })).toBeInTheDocument();
    expect(screen.getByText('$216.67')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // missing supplier
    // one PertRangeBar per row, labelled with its figures
    const bars = screen.getAllByRole('img', { name: /Best case/ });
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveAccessibleName(/Best case \$100\.00, most likely \$200\.00, worst case \$400\.00, PERT estimate \$216\.67/);
  });

  it('shows totals computed from the rows', async () => {
    renderWithProviders(<AssignmentList assignments={rows} onAdd={noop} onEdit={noop} onDelete={noop} />);
    const totals = await screen.findByRole('group', { name: 'Assignment totals' });
    expect(within(totals).getByText('Totals (2 assignments)')).toBeInTheDocument();
    expect(within(totals).getByText('$1,100.00')).toBeInTheDocument(); // best
    expect(within(totals).getByText('$1,200.00')).toBeInTheDocument(); // likely
    expect(within(totals).getByText('$1,400.00')).toBeInTheDocument(); // worst
    expect(within(totals).getByText('$1,216.67')).toBeInTheDocument(); // pert
    expect(within(totals).getByText('$50.00')).toBeInTheDocument(); // sqrt(50^2 + 0^2)
  });

  it('shows an empty state with an add action', async () => {
    const onAdd = vi.fn();
    renderWithProviders(<AssignmentList assignments={[]} onAdd={onAdd} onEdit={noop} onDelete={noop} />);
    expect(await screen.findByText('No assignments yet')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Assignment totals' })).not.toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Add Assignment' });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit and onDelete with the row', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(<AssignmentList assignments={rows} onAdd={noop} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit assignment PM' }));
    expect(onEdit).toHaveBeenCalledWith(rows[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete assignment ENG' }));
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
  });

  it('hides add and row actions when read-only', async () => {
    renderWithProviders(<AssignmentList assignments={rows} onAdd={noop} onEdit={noop} onDelete={noop} readonly />);
    await screen.findByText('ENG');
    expect(screen.queryByRole('button', { name: 'Add Assignment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit assignment/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /actions/i })).not.toBeInTheDocument();
  });
});
