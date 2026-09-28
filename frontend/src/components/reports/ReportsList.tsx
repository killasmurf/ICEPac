import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  listReports,
  deleteReport,
  Report,
  ReportStatus,
  REPORT_TYPE_LABELS,
} from '../../api/reports';
import ReportGenerateDialog from './ReportGenerateDialog';
import ReportDataView from './ReportDataView';

const STATUS_COLORS: Record<ReportStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  generating: 'info',
  ready: 'success',
  failed: 'error',
};

const POLL_INTERVAL_MS = 5000;

interface Props {
  projectId: number;
}

const ReportsList: React.FC<Props> = ({ projectId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await listReports(projectId);
      setReports(result.items);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load reports');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId]);

  // Poll when any report is still in-progress
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasInProgress = reports.some(
      (r) => r.status === 'pending' || r.status === 'generating',
    );
    if (pollTimer.current) clearTimeout(pollTimer.current);
    if (hasInProgress) {
      pollTimer.current = setTimeout(() => load(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [reports, load]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReport(projectId, deleteTarget.id);
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (expandedId === deleteTarget.id) setExpandedId(null);
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete report');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (reportId: number) => {
    setExpandedId((prev) => (prev === reportId ? null : reportId));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Reports</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Generate Report
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : reports.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No reports yet. Click "Generate Report" to create one.</Typography>
        </Paper>
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <React.Fragment key={report.id}>
                  <TableRow hover>
                    <TableCell padding="checkbox">
                      {report.status === 'ready' && report.report_format === 'json' && (
                        <IconButton size="small" onClick={() => toggleExpand(report.id)}>
                          {expandedId === report.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                      {(report.status === 'pending' || report.status === 'generating') && (
                        <CircularProgress size={16} sx={{ m: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>{REPORT_TYPE_LABELS[report.report_type]}</TableCell>
                    <TableCell sx={{ textTransform: 'uppercase' }}>{report.report_format}</TableCell>
                    <TableCell>
                      <Chip label={report.status} size="small" color={STATUS_COLORS[report.status]} />
                    </TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(report)}
                        title="Delete report"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  {expandedId === report.id && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0 }}>
                        <Collapse in unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <ReportDataView report={report} projectId={projectId} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <ReportGenerateDialog
        open={dialogOpen}
        projectId={projectId}
        onClose={() => setDialogOpen(false)}
        onCreated={() => load()}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Report</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsList;
