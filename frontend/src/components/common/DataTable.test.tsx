import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GridColDef } from '@mui/x-data-grid';
import { renderWithProviders } from '../../test/renderWithProviders';
import { DataTable } from './DataTable';

interface Row { id: number; name: string }
const columns: GridColDef<Row>[] = [{ field: 'name', headerName: 'Name', flex: 1 }];
const makeRows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Project ${i + 1}` }));

describe('DataTable', () => {
  it('renders rows and headers', async () => {
    renderWithProviders(<DataTable<Row> rows={makeRows(3)} columns={columns} disableVirtualization />);
    expect(await screen.findByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 3')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows the empty state with zero rows', async () => {
    renderWithProviders(
      <DataTable<Row> rows={[]} columns={columns} emptyTitle="No projects" emptyDescription="Create one" emptyAction={<button>Create</button>} disableVirtualization />,
    );
    expect(await screen.findByText('No projects')).toBeInTheDocument();
    expect(screen.getByText('Create one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('fires onPaginationModelChange when going to the next page (server mode)', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <DataTable<Row>
        rows={makeRows(10)}
        columns={columns}
        rowCount={35}
        paginationModel={{ page: 0, pageSize: 10 }}
        onPaginationModelChange={onChange}
        disableVirtualization
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: /next page/i }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual({ page: 1, pageSize: 10 });
  });

  it('fires onSortModelChange when a header is clicked', async () => {
    const onSort = vi.fn();
    renderWithProviders(<DataTable<Row> rows={makeRows(3)} columns={columns} rowCount={3} onSortModelChange={onSort} disableVirtualization />);
    await userEvent.click(await screen.findByRole('columnheader', { name: /name/i }));
    expect(onSort).toHaveBeenCalled();
    expect(onSort.mock.calls[0][0]).toEqual([{ field: 'name', sort: 'asc' }]);
  });

  it('calls onRowClick with the row', async () => {
    const onRowClick = vi.fn();
    renderWithProviders(<DataTable<Row> rows={makeRows(2)} columns={columns} onRowClick={onRowClick} disableVirtualization />);
    await userEvent.click(await screen.findByText('Project 2'));
    expect(onRowClick).toHaveBeenCalledWith({ id: 2, name: 'Project 2' });
  });

  it('shows a skeleton on first load', async () => {
    renderWithProviders(<DataTable<Row> rows={[]} columns={columns} loading disableVirtualization />);
    expect(await screen.findByRole('status', { name: /loading table/i })).toBeInTheDocument();
  });

  it('shows an inline error with Retry', async () => {
    const onRetry = vi.fn();
    renderWithProviders(<DataTable<Row> rows={[]} columns={columns} error={new Error('x')} onRetry={onRetry} disableVirtualization />);
    const alert = screen.getByRole('alert');
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the toolbar slot', () => {
    renderWithProviders(<DataTable<Row> rows={[]} columns={columns} toolbar={<span>My toolbar</span>} disableVirtualization />);
    expect(screen.getByText('My toolbar')).toBeInTheDocument();
  });
});
