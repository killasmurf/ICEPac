import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Button,
  Tooltip,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Risk } from '../../api/estimation';

interface RiskListProps {
  risks: Risk[];
  onAdd: () => void;
  onEdit: (risk: Risk) => void;
  onDelete: (risk: Risk) => void;
  readonly?: boolean;
}

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Risk Register</Typography>
        {!readonly && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} size="small" color="warning">
            Add Risk
          </Button>
        )}
      </Box>

      {risks.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No risks registered yet. Click "Add Risk" to create one.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>Category</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="center">Probability</TableCell>
                <TableCell align="center">Severity</TableCell>
                <TableCell align="right">Exposure</TableCell>
                <TableCell>Mitigation</TableCell>
                {!readonly && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id} hover>
                  <TableCell>{risk.risk_category_code}</TableCell>
                  <TableCell align="right">{formatCurrency(risk.risk_cost)}</TableCell>
                  <TableCell align="center">
                    {risk.probability_code ? (
                      <Chip label={risk.probability_code} size="small" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {risk.severity_code ? (
                      <Chip
                        label={risk.severity_code}
                        size="small"
                        color={getSeverityColor(risk.severity_code)}
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(risk.risk_exposure)}</strong>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={risk.mitigation_plan || 'No mitigation plan'}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {risk.mitigation_plan || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  {!readonly && (
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(risk)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(risk)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow sx={{ bgcolor: 'warning.50' }}>
                <TableCell colSpan={4}>
                  <strong>Total Risk Exposure ({risks.length} risks)</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totalExposure)}</strong>
                </TableCell>
                <TableCell />
                {!readonly && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default RiskList;
