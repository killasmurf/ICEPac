import React, { useEffect, useState, useCallback } from 'react';
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
} from '../api/reports';
import ReportGenerateDialog from '../components/reports/ReportGenerateDialog';
import ReportDataView from '../components/reports/ReportDataView';

const STATUS_COLORS: Record<ReportStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  generating: 'info',
  ready: 'success',
  failed: 'error',
};

interface Props {
  projectId: number;
}

const ReportsTab: React.FC<Props> = ({ projectId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listReports(projectId);
      setReports(result.items);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (reportId: number) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await deleteReport(projectId, reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (expandedId === reportId) setExpandedId(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete report');
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
                    </TableCell>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>{REPORT_TYPE_LABELS[report.report_type]}</TableCell>
                    <TableCell sx={{ textTransform: 'uppercase' }}>{report.report_format}</TableCell>
                    <TableCell>
                      <Chip label={report.status} size="small" color={STATUS_COLORS[report.status]} />
                    </TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleDelete(report.id)}>
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
        onCreated={load}
      />
    </Box>
  );
};

export default ReportsTab;
