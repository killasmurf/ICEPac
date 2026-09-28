import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material';
import { ReportType, ReportFormat, ReportRequest, REPORT_TYPE_LABELS, generateReport } from '../../api/reports';

interface Props {
  open: boolean;
  projectId: number;
  onClose: () => void;
  onCreated: () => void;
}

const FORMAT_LABELS: Record<ReportFormat, string> = {
  json: 'JSON (view in browser)',
  csv: 'CSV',
  excel: 'Excel',
  pdf: 'PDF',
};

const ReportGenerateDialog: React.FC<Props> = ({ open, projectId, onClose, onCreated }) => {
  const [reportType, setReportType] = useState<ReportType>('cost_control');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('json');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const req: ReportRequest = { report_type: reportType, report_format: reportFormat };
      if (title.trim()) req.title = title.trim();
      await generateReport(projectId, req);
      onCreated();
      onClose();
      setTitle('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Report</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl fullWidth>
          <InputLabel>Report Type</InputLabel>
          <Select
            value={reportType}
            label="Report Type"
            onChange={(e) => setReportType(e.target.value as ReportType)}
          >
            {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][]).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Format</InputLabel>
          <Select
            value={reportFormat}
            label="Format"
            onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
          >
            {(Object.entries(FORMAT_LABELS) as [ReportFormat, string][]).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Custom Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportGenerateDialog;
