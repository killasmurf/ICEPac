import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import { PieChart } from '@mui/x-charts/PieChart';
import type { CostBreakdownItem, ProjectEstimationSummary, SupplierBreakdownItem } from '../../api/estimation';
import { formatCurrency, formatNumber } from '../../utils/format';
import { ChartDataTable } from '../common/ChartDataTable';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { useChartPalette } from '../common/useChartPalette';
import { rankBreakdown, type BreakdownInput } from './estimationUtils';

type Dimension = 'cost_type' | 'region' | 'resource' | 'supplier';

const DIMENSIONS: Array<{ id: Dimension; label: string; noun: string }> = [
  { id: 'cost_type', label: 'Cost type', noun: 'cost type' },
  { id: 'region', label: 'Region', noun: 'region' },
  { id: 'resource', label: 'Resource', noun: 'resource' },
  { id: 'supplier', label: 'Supplier', noun: 'supplier' },
];

const toInputs = (items: CostBreakdownItem[] | SupplierBreakdownItem[], nameField: 'description' | 'name'): BreakdownInput[] =>
  (items as Array<CostBreakdownItem & SupplierBreakdownItem>).map((item) => ({
    code: item.code,
    name: (nameField === 'description' ? item.description : item.name) || item.code,
    total_pert: item.total_pert,
    assignment_count: item.assignment_count,
  }));

function inputsFor(summary: ProjectEstimationSummary, dimension: Dimension): BreakdownInput[] {
  switch (dimension) {
    case 'cost_type':
      return toInputs(summary.by_cost_type, 'description');
    case 'region':
      return toInputs(summary.by_region, 'description');
    case 'resource':
      return toInputs(summary.by_resource, 'description');
    case 'supplier':
      return toInputs(summary.by_supplier, 'name');
  }
}

type TableRow = BreakdownInput & { id: string };

const TABLE_COLUMNS: GridColDef<TableRow>[] = [
  { field: 'code', headerName: 'Code', minWidth: 110, flex: 0.7 },
  { field: 'name', headerName: 'Name', minWidth: 160, flex: 1.5 },
  {
    field: 'total_pert',
    headerName: 'Total PERT',
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    minWidth: 130,
    flex: 1,
    cellClassName: 'tabular-nums',
    valueFormatter: (value: number) => formatCurrency(value),
  },
  {
    field: 'assignment_count',
    headerName: 'Assignments',
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    minWidth: 120,
    flex: 0.7,
    cellClassName: 'tabular-nums',
    valueFormatter: (value: number) => formatNumber(value),
  },
];

const pct = (share: number) => `${share.toFixed(1)}%`;

/** Where the money goes, by cost type, region, resource or supplier: a donut, a ranked list and, on request, the full table. */
export function CostBreakdownCard({ summary }: { summary: ProjectEstimationSummary }) {
  const [dimension, setDimension] = useState<Dimension>('cost_type');
  const [showTable, setShowTable] = useState(false);
  const palette = useChartPalette();
  const meta = DIMENSIONS.find((d) => d.id === dimension) ?? DIMENSIONS[0];

  const inputs = useMemo(() => inputsFor(summary, dimension), [summary, dimension]);
  const ranked = useMemo(() => rankBreakdown(inputs), [inputs]);
  const tableRows = useMemo<TableRow[]>(() => inputs.map((i) => ({ ...i, id: i.code })), [inputs]);
  // The "Other" group takes the last (grey) colour so it never looks like a real category.
  const colorFor = (index: number, isOther?: boolean) => (isOther ? palette[palette.length - 1] : palette[index % (palette.length - 1)]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Typography variant="h6" component="h3">
            Cost breakdown
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={dimension}
            onChange={(_, v: Dimension | null) => v && setDimension(v)}
            aria-label="Break down cost by"
          >
            {DIMENSIONS.map((d) => (
              <ToggleButton key={d.id} value={d.id} sx={{ px: { xs: 1.25, sm: 2 } }}>
                {d.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {ranked.empty ? (
          <EmptyState title={`No cost by ${meta.noun}`} description="No assignments carry a cost for this breakdown yet." />
        ) : (
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ position: 'relative', height: 220, minWidth: 0 }}>
                <PieChart
                  height={220}
                  hideLegend
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  series={[
                    {
                      data: ranked.rows.map((r, i) => ({
                        id: r.code,
                        label: r.name,
                        value: r.total_pert,
                        color: colorFor(i, r.isOther),
                      })),
                      innerRadius: 66,
                      outerRadius: 100,
                      paddingAngle: 2,
                      cornerRadius: 3,
                      valueFormatter: (item) => formatCurrency(item.value),
                    },
                  ]}
                />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Typography variant="h5" component="p" data-testid="breakdown-total" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(ranked.total, { compact: true })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {meta.noun}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box component="ol" aria-hidden="true" data-testid="breakdown-list" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {ranked.rows.map((r, i) => (
                  <Box
                    component="li"
                    key={r.code}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
                  >
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: colorFor(i, r.isOther) }} />
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="body2" className="tabular-nums" sx={{ fontWeight: 600 }}>
                      {formatCurrency(r.total_pert, { compact: true })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" className="tabular-nums" sx={{ width: 52, textAlign: 'right' }}>
                      {pct(r.share)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        )}

        {!ranked.empty && (
          <Box sx={{ position: 'relative' }}>
            <ChartDataTable
              caption={`Cost by ${meta.noun}`}
              headers={['Name', 'Total PERT', 'Share']}
              rows={ranked.rows.map((r) => [r.name, formatCurrency(r.total_pert), pct(r.share)])}
            />
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            startIcon={<TableChartOutlined />}
            aria-expanded={showTable}
            aria-controls="breakdown-table"
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? 'Hide table' : 'Show table'}
          </Button>
          <Collapse in={showTable} unmountOnExit>
            <Box id="breakdown-table" sx={{ mt: 1 }}>
              <DataTable<TableRow> rows={tableRows} columns={TABLE_COLUMNS} ariaLabel={`Cost by ${meta.noun}`} emptyTitle="No data" />
            </Box>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
}

export default CostBreakdownCard;
