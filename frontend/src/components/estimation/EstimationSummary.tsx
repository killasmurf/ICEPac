import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ProjectEstimationSummary as Summary,
  getProjectEstimation,
  CostBreakdownItem,
  SupplierBreakdownItem,
} from '../../api/estimation';

interface EstimationSummaryProps {
  projectId: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, color }) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" sx={{ color: color || 'text.primary', fontWeight: 'bold' }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

interface BreakdownTableProps {
  items: CostBreakdownItem[] | SupplierBreakdownItem[];
  nameField: 'description' | 'name';
}

const BreakdownTable: React.FC<BreakdownTableProps> = ({ items, nameField }) => (
  <TableContainer component={Paper} variant="outlined">
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'grey.100' }}>
          <TableCell>Code</TableCell>
          <TableCell>{nameField === 'description' ? 'Description' : 'Name'}</TableCell>
          <TableCell align="right">Total PERT</TableCell>
          <TableCell align="right">Assignments</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} align="center">
              <Typography color="text.secondary">No data</Typography>
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.code} hover>
              <TableCell>{item.code}</TableCell>
              <TableCell>{(item as any)[nameField]}</TableCell>
              <TableCell align="right">{formatCurrency(item.total_pert)}</TableCell>
              <TableCell align="right">{item.assignment_count}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const EstimationSummary: React.FC<EstimationSummaryProps> = ({ projectId }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectEstimation(projectId);
      setSummary(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load estimation summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!summary) {
    return <Alert severity="info">No estimation data available</Alert>;
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Total PERT Estimate"
            value={formatCurrency(summary.total_pert_estimate)}
            subtitle={`${summary.total_assignments} assignments`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="80% Confidence Range"
            value={`${formatCurrency(summary.confidence_80_low)} - ${formatCurrency(summary.confidence_80_high)}`}
            subtitle={`Std Dev: ${formatCurrency(summary.total_std_deviation)}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Risk Exposure"
            value={formatCurrency(summary.total_risk_exposure)}
            subtitle={`${summary.total_risks} risks identified`}
            color="warning.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Risk-Adjusted Estimate"
            value={formatCurrency(summary.risk_adjusted_estimate)}
            subtitle="PERT + Risk Exposure"
            color="primary.main"
          />
        </Grid>
      </Grid>

      {/* WBS Items Summary */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            WBS Summary ({summary.total_wbs_items} items)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>WBS Code</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">Assignments</TableCell>
                  <TableCell align="right">PERT</TableCell>
                  <TableCell align="right">Risks</TableCell>
                  <TableCell align="right">Exposure</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.wbs_summaries.map((wbs) => (
                  <TableRow key={wbs.wbs_id} hover>
                    <TableCell>{wbs.wbs_code || '-'}</TableCell>
                    <TableCell>{wbs.wbs_title}</TableCell>
                    <TableCell align="right">{wbs.assignment_count}</TableCell>
                    <TableCell align="right">{formatCurrency(wbs.total_pert_estimate)}</TableCell>
                    <TableCell align="right">{wbs.risk_count}</TableCell>
                    <TableCell align="right">{formatCurrency(wbs.total_risk_exposure)}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor:
                            wbs.approval_status === 'approved'
                              ? 'success.100'
                              : wbs.approval_status === 'submitted'
                              ? 'info.100'
                              : wbs.approval_status === 'rejected'
                              ? 'error.100'
                              : 'grey.200',
                        }}
                      >
                        {wbs.approval_status}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cost Breakdowns
          </Typography>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="By Cost Type" />
            <Tab label="By Region" />
            <Tab label="By Resource" />
            <Tab label="By Supplier" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <BreakdownTable items={summary.by_cost_type} nameField="description" />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <BreakdownTable items={summary.by_region} nameField="description" />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <BreakdownTable items={summary.by_resource} nameField="description" />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <BreakdownTable items={summary.by_supplier} nameField="name" />
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EstimationSummary;
