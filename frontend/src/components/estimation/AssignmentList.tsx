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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Assignment } from '../../api/estimation';

interface AssignmentListProps {
  assignments: Assignment[];
  onAdd: () => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
  readonly?: boolean;
}

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Resource Assignments</Typography>
        {!readonly && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} size="small">
            Add Assignment
          </Button>
        )}
      </Box>

      {assignments.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No assignments yet. Click "Add Assignment" to create one.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>Resource</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Best</TableCell>
                <TableCell align="right">Likely</TableCell>
                <TableCell align="right">Worst</TableCell>
                <TableCell align="right">PERT</TableCell>
                <TableCell align="right">Std Dev</TableCell>
                {!readonly && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id} hover>
                  <TableCell>{assignment.resource_code}</TableCell>
                  <TableCell>{assignment.supplier_code || '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(assignment.best_estimate)}</TableCell>
                  <TableCell align="right">{formatCurrency(assignment.likely_estimate)}</TableCell>
                  <TableCell align="right">{formatCurrency(assignment.worst_estimate)}</TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(assignment.pert_estimate)}</strong>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(assignment.std_deviation)}</TableCell>
                  {!readonly && (
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(assignment)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(assignment)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell colSpan={2}>
                  <strong>Totals ({assignments.length} assignments)</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.best)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.likely)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.worst)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.pert)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(combinedStdDev)}</strong>
                </TableCell>
                {!readonly && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AssignmentList;
