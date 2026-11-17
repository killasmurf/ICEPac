import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GridColDef } from '@mui/x-data-grid';
import { renderWithProviders } from '../../test/renderWithProviders';
import { DataTable, useResponsiveColumns } from './DataTable';

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
    expect(screen.getByText('Could not load data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the toolbar slot', () => {
    renderWithProviders(<DataTable<Row> rows={[]} columns={columns} toolbar={<span>My toolbar</span>} disableVirtualization />);
    expect(screen.getByText('My toolbar')).toBeInTheDocument();
  });

  it('renders the footer under the grid', () => {
    renderWithProviders(<DataTable<Row> rows={makeRows(2)} columns={columns} footer={<div>Totals here</div>} disableVirtualization />);
    expect(screen.getByText('Totals here')).toBeInTheDocument();
  });

  it('hides columns named in columnVisibilityModel', async () => {
    const two: GridColDef<Row>[] = [...columns, { field: 'id', headerName: 'Identifier', width: 100 }];
    renderWithProviders(<DataTable<Row> rows={makeRows(1)} columns={two} columnVisibilityModel={{ id: false }} disableVirtualization />);
    expect(await screen.findByText('Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Identifier')).toBeNull();
  });
});

describe('useResponsiveColumns', () => {
  const fields = ['email'];
  function Probe() {
    return <span data-testid="model">{JSON.stringify(useResponsiveColumns(fields))}</span>;
  }
  const mockMatch = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));

  it('hides the named columns on small screens only', () => {
    mockMatch(true);
    const { unmount } = renderWithProviders(<Probe />);
    expect(screen.getByTestId('model').textContent).toBe('{"email":false}');
    unmount();
    mockMatch(false);
    renderWithProviders(<Probe />);
    expect(screen.getByTestId('model').textContent).toBe('{}');
    vi.unstubAllGlobals();
  });
});
