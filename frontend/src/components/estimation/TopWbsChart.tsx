import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import type { WBSCostSummary } from '../../api/estimation';
import { formatCurrency } from '../../utils/format';
import { ChartDataTable } from '../common/ChartDataTable';
import { PertRangeBar } from '../common/PertRangeBar';
import { useChartPalette } from '../common/useChartPalette';
import { topWbsByEstimate } from './estimationUtils';

const ROW_HEIGHT = 34;
const truncate = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);
const labelOf = (w: WBSCostSummary) => (w.wbs_code ? `${w.wbs_code} ${w.wbs_title}` : w.wbs_title);

/** Ten biggest WBS items by PERT estimate, each with its 80% range underneath. */
export function TopWbsChart({ items }: { items: WBSCostSummary[] }) {
  const theme = useTheme();
  const palette = useChartPalette();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const top = topWbsByEstimate(items, 10);
  if (top.length === 0) return null;
  const byId = new Map(top.map((w) => [w.wbs_id, w]));
  const max = narrow ? 14 : 28;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h3">
          Top WBS items by estimate
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Top {top.length} of {items.length} by PERT estimate
        </Typography>
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <BarChart
            layout="horizontal"
            height={top.length * ROW_HEIGHT + 56}
            hideLegend
            grid={{ vertical: true }}
            margin={{ top: 8, right: 28, bottom: 8, left: 8 }}
            series={[{ id: 'pert', label: 'PERT estimate', data: top.map((w) => w.total_pert_estimate), color: palette[0], valueFormatter: (v) => formatCurrency(v) }]}
            yAxis={[
              {
                id: 'wbs',
                scaleType: 'band',
                data: top.map((w) => w.wbs_id),
                width: narrow ? 104 : 200,
                categoryGapRatio: 0.3,
                valueFormatter: (id: number, ctx) => {
                  const w = byId.get(id);
                  const label = w ? labelOf(w) : '';
                  return ctx.location === 'tooltip' ? label : truncate(label, max);
                },
              },
            ]}
            xAxis={[{ id: 'amount', tickNumber: narrow ? 3 : 5, valueFormatter: (v: number) => formatCurrency(v, { compact: true }) }]}
          />
          <ChartDataTable
            caption="Top WBS items by estimate"
            headers={['WBS item', 'PERT estimate', '80% low', '80% high']}
            rows={top.map((w) => [labelOf(w), formatCurrency(w.total_pert_estimate), formatCurrency(w.confidence_80_low), formatCurrency(w.confidence_80_high)])}
          />
        </Box>

        <Typography variant="subtitle2" component="h4" sx={{ mt: 3, mb: 1 }}>
          80% range
        </Typography>
        <Box component="ul" data-testid="wbs-ranges" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {top.map((w) => (
            <Box
              component="li"
              key={w.wbs_id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' },
                alignItems: 'center',
                columnGap: 3,
                py: 0.75,
                borderTop: 1,
                borderColor: 'divider',
                '&:first-of-type': { borderTop: 0 },
              }}
            >
              <Typography variant="body2" noWrap title={labelOf(w)}>
                {labelOf(w)}
              </Typography>
              <PertRangeBar
                best={w.confidence_80_low}
                likely={w.total_pert_estimate}
                worst={w.confidence_80_high}
                pert={w.total_pert_estimate}
                low80={w.confidence_80_low}
                high80={w.confidence_80_high}
                minLabel="Low"
                maxLabel="High"
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

export default TopWbsChart;
