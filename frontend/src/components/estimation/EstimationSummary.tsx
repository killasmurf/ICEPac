import React, { useMemo } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined';
import { useQuery } from '@tanstack/react-query';
import { getProjectEstimation, WBSCostSummary } from '../../api/estimation';
import { formatCurrency } from '../../utils/format';
import { DataTable, useResponsiveColumns } from '../common/DataTable';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { PertRangeBar } from '../common/PertRangeBar';
import { CardSkeleton } from '../common/CardSkeleton';
import { TableSkeleton } from '../common/TableSkeleton';
import { EmptyState } from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import { CostBreakdownCard } from './CostBreakdownCard';
import { TopWbsChart } from './TopWbsChart';
import { estimationKey } from './queryKeys';
import { summaryRangeBar } from './estimationUtils';

interface EstimationSummaryProps {
  projectId: number;
  /** Leave out the four headline cards when the page already shows those totals (for example the project header band). */
  hideHeadline?: boolean;
}

type WBSRow = WBSCostSummary & { id: number };

/** Low-priority WBS summary columns, hidden below sm so the table keeps title, PERT and status on phones. */
const WBS_LOW_PRIORITY = ['wbs_code', 'assignment_count', 'risk_count', 'total_risk_exposure'];

const EstimationSummary: React.FC<EstimationSummaryProps> = ({ projectId, hideHeadline = false }) => {
  const wbsColumnVisibility = useResponsiveColumns(WBS_LOW_PRIORITY);
  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: estimationKey(projectId),
    queryFn: () => getProjectEstimation(projectId),
  });

  const wbsRows = useMemo<WBSRow[]>(
    () => (summary?.wbs_summaries ?? []).map((w) => ({ ...w, id: w.wbs_id })),
    [summary],
  );

  const wbsColumns = useMemo<GridColDef<WBSRow>[]>(
    () => [
      {
        field: 'wbs_code',
        headerName: 'WBS Code',
        minWidth: 110,
        flex: 0.7,
        valueFormatter: (value: string | null) => value || '-',
      },
      { field: 'wbs_title', headerName: 'Title', minWidth: 180, flex: 1.6 },
      {
        field: 'assignment_count',
        headerName: 'Assignments',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 120,
        flex: 0.7,
        cellClassName: 'tabular-nums',
      },
      {
        field: 'total_pert_estimate',
        headerName: 'PERT',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 130,
        flex: 1,
        cellClassName: 'tabular-nums',
        valueFormatter: (value: number) => formatCurrency(value),
      },
      {
        field: 'risk_count',
        headerName: 'Risks',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 90,
        flex: 0.5,
        cellClassName: 'tabular-nums',
      },
      {
        field: 'total_risk_exposure',
        headerName: 'Exposure',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        minWidth: 130,
        flex: 1,
        cellClassName: 'tabular-nums',
        valueFormatter: (value: number) => formatCurrency(value),
      },
      {
        field: 'approval_status',
        headerName: 'Status',
        align: 'center',
        headerAlign: 'center',
        minWidth: 120,
        flex: 0.7,
        renderCell: ({ row }) => <StatusChip kind="approval" value={row.approval_status} />,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <Box role="status" aria-busy="true" aria-label="Loading estimation summary">
        {!hideHeadline && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[0, 1, 2, 3].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
                <CardSkeleton lines={2} />
              </Grid>
            ))}
          </Grid>
        )}
        <TableSkeleton rows={5} columns={5} />
      </Box>
    );
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Could not load the estimation summary"
        description="Something went wrong while loading. Check your connection and try again."
        action={
          <Button variant="outlined" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (summary.total_wbs_items === 0 && summary.total_assignments === 0) {
    return (
      <EmptyState
        icon={<AssessmentOutlined />}
        title="No estimation data yet"
        description="Import a schedule or add WBS items and assignments, and the cost summary will appear here."
      />
    );
  }

  const range = summaryRangeBar(summary);
  const compact = (v: number) => formatCurrency(v, { compact: true });

  return (
    <Box>
      {/* Headline figures */}
      {!hideHeadline && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Total PERT Estimate"
              value={compact(summary.total_pert_estimate)}
              hint={`${formatCurrency(summary.total_pert_estimate)} across ${summary.total_assignments} assignments`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Std Deviation"
              value={compact(summary.total_std_deviation)}
              hint={formatCurrency(summary.total_std_deviation)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Risk Exposure"
              value={compact(summary.total_risk_exposure)}
              hint={`${formatCurrency(summary.total_risk_exposure)} from ${summary.total_risks} risks`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label="Risk-Adjusted Estimate"
              value={compact(summary.risk_adjusted_estimate)}
              hint={`${formatCurrency(summary.risk_adjusted_estimate)} (PERT + risk exposure)`}
            />
          </Grid>
        </Grid>
      )}

      {/* 80% interval */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            80% Confidence Range
          </Typography>
          <Typography variant="h5" component="p" className="tabular-nums" sx={{ mb: 1 }}>
            {formatCurrency(summary.confidence_80_low)} to {formatCurrency(summary.confidence_80_high)}
          </Typography>
          <PertRangeBar {...range} minLabel="Low (−3σ)" maxLabel="High (+3σ)" />
          <Typography variant="caption" color="text.secondary">
            The gold marker is the PERT estimate and the shaded band is the 80% range. The bar spans three standard
            deviations either side of the estimate.
          </Typography>
        </CardContent>
      </Card>

      <CostBreakdownCard summary={summary} />
      <TopWbsChart items={summary.wbs_summaries} />

      {/* WBS Items Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            WBS Summary ({summary.total_wbs_items} items)
          </Typography>
          <DataTable<WBSRow>
            rows={wbsRows}
            columns={wbsColumns}
            columnVisibilityModel={wbsColumnVisibility}
            ariaLabel="WBS cost summary"
            emptyTitle="No WBS items"
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default EstimationSummary;
