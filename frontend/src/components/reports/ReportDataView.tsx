import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import { Report, CostControlReport, BOEReport, RiskSummaryReport, getReportData } from '../../api/reports';

interface Props {
  report: Report;
  projectId: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const APPROVAL_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
};

const CostControlView: React.FC<{ data: CostControlReport }> = ({ data }) => (
  <Box>
    <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
      <Box><Typography variant="caption">Total PERT</Typography><Typography variant="h6">${fmt(data.total_pert)}</Typography></Box>
      <Box><Typography variant="caption">Risk Exposure</Typography><Typography variant="h6">${fmt(data.total_risk_exposure)}</Typography></Box>
      <Box><Typography variant="caption">Risk-Adjusted</Typography><Typography variant="h6">${fmt(data.total_risk_adjusted)}</Typography></Box>
      <Box><Typography variant="caption">80% CI</Typography><Typography variant="h6">${fmt(data.confidence_80_low)} – ${fmt(data.confidence_80_high)}</Typography></Box>
    </Box>
    <Divider sx={{ mb: 2 }} />
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>WBS</TableCell>
          <TableCell>Title</TableCell>
          <TableCell align="right">Best</TableCell>
          <TableCell align="right">Likely</TableCell>
          <TableCell align="right">Worst</TableCell>
          <TableCell align="right">PERT</TableCell>
          <TableCell align="right">Risk</TableCell>
          <TableCell align="right">Adjusted</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.line_items.map((row, i) => (
          <TableRow key={i}>
            <TableCell>{row.wbs_code ?? '—'}</TableCell>
            <TableCell>{row.wbs_title}</TableCell>
            <TableCell align="right">{fmt(row.best_estimate)}</TableCell>
            <TableCell align="right">{fmt(row.likely_estimate)}</TableCell>
            <TableCell align="right">{fmt(row.worst_estimate)}</TableCell>
            <TableCell align="right"><strong>{fmt(row.pert_estimate)}</strong></TableCell>
            <TableCell align="right">{fmt(row.risk_exposure)}</TableCell>
            <TableCell align="right">{fmt(row.risk_adjusted)}</TableCell>
            <TableCell>
              <Chip
                label={row.approval_status}
                size="small"
                color={APPROVAL_COLORS[row.approval_status] ?? 'default'}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
);

const BOEView: React.FC<{ data: BOEReport }> = ({ data }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 2 }}>Total PERT: ${fmt(data.total_pert)}</Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>WBS</TableCell>
          <TableCell>Resource</TableCell>
          <TableCell>Cost Type</TableCell>
          <TableCell>Technique</TableCell>
          <TableCell align="right">Best</TableCell>
          <TableCell align="right">Likely</TableCell>
          <TableCell align="right">Worst</TableCell>
          <TableCell align="right">PERT</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.line_items.map((row, i) => (
          <TableRow key={i}>
            <TableCell>{row.wbs_code ?? '—'}</TableCell>
            <TableCell>{row.resource_code}</TableCell>
            <TableCell>{row.cost_type_code ?? '—'}</TableCell>
            <TableCell>{row.estimating_technique_code ?? '—'}</TableCell>
            <TableCell align="right">{fmt(row.best_estimate)}</TableCell>
            <TableCell align="right">{fmt(row.likely_estimate)}</TableCell>
            <TableCell align="right">{fmt(row.worst_estimate)}</TableCell>
            <TableCell align="right"><strong>{fmt(row.pert_estimate)}</strong></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
);

const RiskView: React.FC<{ data: RiskSummaryReport }> = ({ data }) => (
  <Box>
    <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
      <Box><Typography variant="caption">Total Risks</Typography><Typography variant="h6">{data.total_risks}</Typography></Box>
      <Box><Typography variant="caption">Total Exposure</Typography><Typography variant="h6">${fmt(data.total_exposure)}</Typography></Box>
    </Box>
    <Divider sx={{ mb: 2 }} />
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>WBS</TableCell>
          <TableCell>Title</TableCell>
          <TableCell align="right">Risks</TableCell>
          <TableCell align="right">Total Exposure</TableCell>
          <TableCell align="right">Max Exposure</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.items.map((row, i) => (
          <TableRow key={i}>
            <TableCell>{row.wbs_code ?? '—'}</TableCell>
            <TableCell>{row.wbs_title}</TableCell>
            <TableCell align="right">{row.risk_count}</TableCell>
            <TableCell align="right">{fmt(row.total_exposure)}</TableCell>
            <TableCell align="right">{fmt(row.max_exposure)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
);

const ReportDataView: React.FC<Props> = ({ report, projectId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getReportData(projectId, report.id)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail || 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, [projectId, report.id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  if (report.report_type === 'cost_control') return <CostControlView data={data as CostControlReport} />;
  if (report.report_type === 'boe') return <BOEView data={data as BOEReport} />;
  if (report.report_type === 'risk_summary') return <RiskView data={data as RiskSummaryReport} />;

  return <Box component="pre" sx={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</Box>;
};

export default ReportDataView;
