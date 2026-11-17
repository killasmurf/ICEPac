import React, { useMemo } from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Assignment } from '../../api/estimation';
import { formatCurrency } from '../../utils/format';
import { DataTable } from '../common/DataTable';
import { PertRangeBar } from '../common/PertRangeBar';
import TotalsStrip from './TotalsStrip';

interface AssignmentListProps {
  assignments: Assignment[];
  onAdd: () => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
  readonly?: boolean;
}

const money = (value: number | null | undefined) => formatCurrency(value);

const AssignmentList: React.FC<AssignmentListProps> = ({
  assignments,
  onAdd,
  onEdit,
  onDelete,
  readonly = false,
}) => {
  // Calculate totals
  const totals = assignments.reduce(
    (acc, a) => ({
      best: acc.best + a.best_estimate,
      likely: acc.likely + a.likely_estimate,
      worst: acc.worst + a.worst_estimate,
      pert: acc.pert + a.pert_estimate,
      variance: acc.variance + Math.pow(a.std_deviation, 2),
    }),
    { best: 0, likely: 0, worst: 0, pert: 0, variance: 0 }
  );
  const combinedStdDev = Math.sqrt(totals.variance);

  const columns = useMemo<GridColDef<Assignment>[]>(() => {
    const amount = (field: keyof Assignment, headerName: string, extra: Partial<GridColDef<Assignment>> = {}): GridColDef<Assignment> => ({
      field,
      headerName,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      minWidth: 110,
      flex: 0.8,
      cellClassName: 'tabular-nums',
      valueFormatter: (value: number) => money(value),
      ...extra,
    });

    const cols: GridColDef<Assignment>[] = [
      { field: 'resource_code', headerName: 'Resource', minWidth: 120, flex: 1 },
      {
        field: 'supplier_code',
        headerName: 'Supplier',
        minWidth: 100,
        flex: 0.8,
        valueFormatter: (value: string | null) => value || '-',
      },
      amount('best_estimate', 'Best'),
      amount('likely_estimate', 'Likely'),
      amount('worst_estimate', 'Worst'),
      amount('pert_estimate', 'PERT', {
        renderCell: ({ row }) => (
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            {money(row.pert_estimate)}
          </Typography>
        ),
      }),
      amount('std_deviation', 'Std Dev'),
      {
        field: 'range',
        headerName: 'Range',
        minWidth: 190,
        flex: 1.2,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Box sx={{ width: '100%' }}>
            <PertRangeBar
              best={row.best_estimate}
              likely={row.likely_estimate}
              worst={row.worst_estimate}
              pert={row.pert_estimate}
            />
          </Box>
        ),
      },
    ];

    if (!readonly) {
      cols.push({
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        minWidth: 110,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" aria-label={`Edit assignment ${row.resource_code}`} onClick={() => onEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete assignment ${row.resource_code}`}
                onClick={() => onDelete(row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      });
    }
    return cols;
  }, [readonly, onEdit, onDelete]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" component="h3">
          Resource Assignments
        </Typography>
        {!readonly && (
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={onAdd} size="small">
            Add Assignment
          </Button>
        )}
      </Box>

      <DataTable<Assignment>
        rows={assignments}
        columns={columns}
        ariaLabel="Resource assignments"
        footer={
          assignments.length > 0 ? (
            <TotalsStrip
              label={`Totals (${assignments.length} assignments)`}
              ariaLabel="Assignment totals"
              items={[
                { label: 'Best', value: money(totals.best) },
                { label: 'Likely', value: money(totals.likely) },
                { label: 'Worst', value: money(totals.worst) },
                { label: 'PERT', value: money(totals.pert), emphasis: true },
                { label: 'Std Dev', value: money(combinedStdDev) },
              ]}
            />
          ) : undefined
        }
        emptyTitle="No assignments yet"
        emptyDescription={readonly ? 'Nothing has been assigned to this item.' : 'Add a resource with a three-point estimate to start costing this item.'}
        emptyAction={
          readonly ? undefined : (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd}>
              Add Assignment
            </Button>
          )
        }
      />
    </Box>
  );
};

export default AssignmentList;
