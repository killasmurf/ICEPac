import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import {
  DataGrid,
  gridDataRowIdsSelector,
  useGridApiContext,
  useGridSelector,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridPaginationModel,
  type GridRowId,
  type GridRowsProp,
  type GridSortModel,
} from '@mui/x-data-grid';
import { EmptyState } from './EmptyState';
import ErrorState from './ErrorState';
import { TableSkeleton } from './TableSkeleton';

declare module '@mui/x-data-grid' {
  interface NoRowsOverlayPropsOverrides {
    emptyTitle?: string;
    emptyDescription?: React.ReactNode;
    emptyAction?: React.ReactNode;
  }
}

export interface DataTableProps<R extends { id?: GridRowId } = Record<string, unknown> & { id?: GridRowId }> {
  rows: GridRowsProp<R>;
  columns: GridColDef<R>[];
  loading?: boolean;
  /** When provided the table runs in server pagination and server sorting mode. */
  rowCount?: number;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  onRowClick?: (row: R) => void;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Rendered above the grid (search field, filters, buttons). */
  toolbar?: React.ReactNode;
  /** Rendered directly under the grid inside the same outlined container, for example a totals block. */
  footer?: React.ReactNode;
  /** Hides columns by field name. See useResponsiveColumns for hiding low-priority columns on phones. */
  columnVisibilityModel?: GridColumnVisibilityModel;
  /** Accessible name for the grid. */
  ariaLabel?: string;
  /** Error from the data source. Shows an inline alert with a retry button. */
  error?: unknown;
  onRetry?: () => void;
  /** Renders every row and column. jsdom has no layout, so tests set this. */
  disableVirtualization?: boolean;
}

function NoRowsOverlay({ emptyTitle, emptyDescription, emptyAction }: {
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <EmptyState icon={<InboxOutlined />} title={emptyTitle ?? 'Nothing to show'} description={emptyDescription} action={emptyAction} />
    </Box>
  );
}

/** Skeleton on first load (no rows yet), thin progress bar when refreshing existing rows. */
function LoadingOverlay() {
  const apiRef = useGridApiContext();
  const hasRows = useGridSelector(apiRef, gridDataRowIdsSelector).length > 0;
  return hasRows ? <LinearProgress /> : (
    <Box sx={{ p: 2 }}>
      <TableSkeleton rows={5} columns={4} />
    </Box>
  );
}

/**
 * Column visibility model that hides the named low-priority columns below the `sm` breakpoint,
 * so the table does not force sideways scrolling on phones for columns of little value.
 */
export function useResponsiveColumns(hiddenBelowSm: readonly string[]): GridColumnVisibilityModel {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  return React.useMemo(
    () => (small ? Object.fromEntries(hiddenBelowSm.map((field) => [field, false])) : {}),
    [small, hiddenBelowSm],
  );
}

export function DataTable<R extends { id?: GridRowId } = Record<string, unknown> & { id?: GridRowId }>({
  rows,
  columns,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
  toolbar,
  footer,
  columnVisibilityModel,
  ariaLabel,
  error,
  onRetry,
  disableVirtualization,
}: DataTableProps<R>) {
  const server = rowCount !== undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      {toolbar && <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>{toolbar}</Box>}
      {error != null && (
        <ErrorState
          title="Could not load data"
          description="Something went wrong while loading. Check your connection and try again."
          action={onRetry && <Button variant="outlined" onClick={onRetry}>Retry</Button>}
        />
      )}
      <Box
        sx={{ width: '100%', minHeight: 240, minWidth: 0, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper' }}
      >
        <DataGrid<R>
          rows={rows}
          columns={columns}
          loading={loading}
          aria-label={ariaLabel}
          density="comfortable"
          disableRowSelectionOnClick
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          paginationMode={server ? 'server' : 'client'}
          sortingMode={server ? 'server' : 'client'}
          rowCount={server ? rowCount : undefined}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          sortModel={sortModel}
          onSortModelChange={onSortModelChange}
          columnVisibilityModel={columnVisibilityModel}
          onRowClick={onRowClick ? (params) => onRowClick(params.row) : undefined}
          disableVirtualization={disableVirtualization}
          slots={{ noRowsOverlay: NoRowsOverlay, loadingOverlay: LoadingOverlay }}
          slotProps={{ noRowsOverlay: { emptyTitle, emptyDescription, emptyAction } }}
          sx={(theme) => {
            const p = (theme.vars ?? theme).palette;
            return {
              '--DataGrid-t-color-background-base': p.background.paper,
              '--DataGrid-t-header-background-base': p.background.paper,
              backgroundColor: p.background.paper,
              border: 0,
              borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { borderBottomColor: p.divider },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 600,
                color: p.text.secondary,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.04em',
              },
              '& .MuiDataGrid-cell, & .MuiDataGrid-footerContainer': { borderColor: p.divider },
              '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within': {
                outline: `2px solid ${p.primary.main}`,
                outlineOffset: -2,
              },
              '& .MuiDataGrid-row:hover': onRowClick ? { cursor: 'pointer' } : undefined,
            };
          }}
        />
        {footer && <Box sx={{ borderTop: 1, borderColor: 'divider' }}>{footer}</Box>}
      </Box>
    </Box>
  );
}

export default DataTable;
