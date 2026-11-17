import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PieChart } from '@mui/x-charts/PieChart';
import type { ApprovalTotals } from '../../api/dashboard';
import { ChartDataTable } from '../../components/common/ChartDataTable';
import { useApprovalColors } from '../../components/common/useChartPalette';
import { formatNumber, formatPercent } from '../../utils/format';
import { approvalTotal, approvedShare } from './dashboardUtils';
import Panel from './Panel';

const ORDER = [
  { key: 'approved', label: 'Approved' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'draft', label: 'Draft' },
] as const;

/** Donut of WBS items by approval state with the approved share in the centre. */
export function ApprovalStatus({ totals }: { totals: ApprovalTotals }) {
  const colors = useApprovalColors();
  const total = approvalTotal(totals);
  const share = approvedShare(totals);
  const slices = ORDER.map(({ key, label }) => ({ id: key, label, value: totals[key], color: colors[key] }));
  // An all-zero donut draws nothing, so show a neutral ring instead.
  const data = total === 0 ? [{ id: 'none', label: 'No WBS items', value: 1, color: colors.empty }] : slices;

  return (
    <Panel title="Approval status" subtitle="WBS items by approval state">
      <Box sx={{ position: 'relative', height: 220, minWidth: 0 }}>
        <PieChart
          height={220}
          hideLegend
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          series={[{ data, innerRadius: 66, outerRadius: 100, paddingAngle: total === 0 ? 0 : 2, cornerRadius: 3 }]}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="h4" component="p" data-testid="approved-percent" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {share == null ? '—' : formatPercent(share)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            approved
          </Typography>
        </Box>
      </Box>
      {/* Text legend: colour is never the only cue. The hidden table below carries the same figures for screen readers. */}
      <Box component="ul" aria-hidden="true" sx={{ listStyle: 'none', m: 0, mt: 2, p: 0 }}>
        {slices.map((s) => (
          <Box
            component="li"
            key={s.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider' }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: s.color }} />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {s.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(s.value)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {total === 0 ? '—' : formatPercent(s.value / total)}
            </Typography>
          </Box>
        ))}
      </Box>
      <ChartDataTable
        caption="WBS items by approval status"
        headers={['Status', 'WBS items']}
        rows={[...slices.map((s) => [s.label, formatNumber(s.value)]), ['Share approved', share == null ? '—' : formatPercent(share)]]}
      />
    </Panel>
  );
}

export default ApprovalStatus;
