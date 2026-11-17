import React, { useMemo } from 'react';
import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Risk } from '../../api/estimation';
import { formatCurrency } from '../../utils/format';
import { DataTable } from '../common/DataTable';
import TotalsStrip from './TotalsStrip';

interface RiskListProps {
  risks: Risk[];
  onAdd: () => void;
  onEdit: (risk: Risk) => void;
  onDelete: (risk: Risk) => void;
  readonly?: boolean;
}

const getSeverityColor = (code: string | null): 'default' | 'success' | 'warning' | 'error' => {
  if (!code) return 'default';
  switch (code.toUpperCase()) {
    case 'LOW':
    case 'L':
      return 'success';
    case 'MEDIUM':
    case 'M':
      return 'warning';
    case 'HIGH':
    case 'H':
    case 'CRITICAL':
    case 'C':
      return 'error';
    default:
      return 'default';
  }
};

const RiskList: React.FC<RiskListProps> = ({
  risks,
  onAdd,
  onEdit,
  onDelete,
  readonly = false,
}) => {
  // Calculate total exposure
  const totalExposure = risks.reduce((sum, r) => sum + r.risk_exposure, 0);

  const columns = useMemo<GridColDef<Risk>[]>(() => {
    const cols: GridColDef<Risk>[] = [
      { field: 'risk_category_code', headerName: 'Category', minWidth: 120, flex: 1 },
      {
        field: 'risk_cost',
        headerName: 'Cost',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 120,
        flex: 0.8,
        cellClassName: 'tabular-nums',
        valueFormatter: (value: number) => formatCurrency(value),
      },
      {
        field: 'probability_code',
        headerName: 'Probability',
        align: 'center',
        headerAlign: 'center',
        minWidth: 110,
        renderCell: ({ row }) =>
          row.probability_code ? <Chip label={row.probability_code} size="small" variant="outlined" /> : '-',
      },
      {
        field: 'severity_code',
        headerName: 'Severity',
        align: 'center',
        headerAlign: 'center',
        minWidth: 110,
        renderCell: ({ row }) =>
          row.severity_code ? (
            <Chip label={row.severity_code} size="small" color={getSeverityColor(row.severity_code)} />
          ) : (
            '-'
          ),
      },
      {
        field: 'risk_exposure',
        headerName: 'Exposure',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 120,
        flex: 0.8,
        renderCell: ({ row }) => (
          <Typography component="span" variant="body2" className="tabular-nums" sx={{ fontWeight: 700 }}>
            {formatCurrency(row.risk_exposure)}
          </Typography>
        ),
      },
      {
        field: 'mitigation_plan',
        headerName: 'Mitigation',
        minWidth: 180,
        flex: 1.5,
        renderCell: ({ row }) => (
          <Tooltip title={row.mitigation_plan || 'No mitigation plan'}>
            <Typography variant="body2" noWrap>
              {row.mitigation_plan || '-'}
            </Typography>
          </Tooltip>
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
              <IconButton size="small" aria-label={`Edit risk ${row.risk_category_code}`} onClick={() => onEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete risk ${row.risk_category_code}`}
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
          Risk Register
        </Typography>
        {!readonly && (
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={onAdd} size="small">
            Add Risk
          </Button>
        )}
      </Box>

      <DataTable<Risk>
        rows={risks}
        columns={columns}
        ariaLabel="Risk register"
        footer={
          risks.length > 0 ? (
            <TotalsStrip
              label={`Total Risk Exposure (${risks.length} risks)`}
              ariaLabel="Risk totals"
              items={[{ label: 'Exposure', value: formatCurrency(totalExposure), emphasis: true }]}
            />
          ) : undefined
        }
        emptyTitle="No risks registered yet"
        emptyDescription={readonly ? 'No risks have been recorded for this item.' : 'Record what could add cost to this item and how you plan to mitigate it.'}
        emptyAction={
          readonly ? undefined : (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd}>
              Add Risk
            </Button>
          )
        }
      />
    </Box>
  );
};

export default RiskList;
