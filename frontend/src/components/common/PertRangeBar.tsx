import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { brand } from '../../theme/tokens';
import { formatCurrency } from '../../utils/format';

export interface PertRangeBarProps {
  best: number;
  likely: number;
  worst: number;
  pert: number;
  low80?: number;
  high80?: number;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function PertRangeBar({ best, likely, worst, pert, low80, high80 }: PertRangeBarProps) {
  const span = worst - best;
  const degenerate = span === 0;
  const pos = (v: number) => (degenerate ? 50 : clamp(((v - best) / span) * 100));
  const pct = (v: number) => `${pos(v).toFixed(2)}%`;
  const hasBand = !degenerate && low80 != null && high80 != null;
  const fc = (v: number) => formatCurrency(v);

  const summary =
    `Best case ${fc(best)}, most likely ${fc(likely)}, worst case ${fc(worst)}, PERT estimate ${fc(pert)}` +
    (low80 != null && high80 != null ? `, 80% range ${fc(low80)} to ${fc(high80)}` : '');

  const tip = (
    <Box>
      <div>Best: {fc(best)}</div>
      <div>Most likely: {fc(likely)}</div>
      <div>Worst: {fc(worst)}</div>
      <div>PERT: {fc(pert)}</div>
      {low80 != null && high80 != null && (
        <div>
          80% range: {fc(low80)} to {fc(high80)}
        </div>
      )}
    </Box>
  );

  return (
    <Tooltip title={tip} arrow describeChild>
      <Box role="img" aria-label={summary} tabIndex={0} sx={{ width: '100%', minWidth: 120, py: 0.5, borderRadius: 1, '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main', outlineOffset: 2 } }}>
        <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
          {hasBand && (
            <Box
              data-testid="pert-band"
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: pct(low80),
                width: `${(pos(high80) - pos(low80)).toFixed(2)}%`,
                bgcolor: 'text.secondary',
                opacity: 0.45,
                borderRadius: 5,
              }}
            />
          )}
          {!degenerate && (
            <Box
              data-testid="pert-likely"
              sx={{ position: 'absolute', top: -3, bottom: -3, width: 2, ml: '-1px', left: pct(likely), bgcolor: 'text.primary' }}
            />
          )}
          <Box
            data-testid="pert-marker"
            data-position={pos(pert).toFixed(2)}
            sx={{
              position: 'absolute',
              top: '50%',
              left: pct(pert),
              width: 14,
              height: 14,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              bgcolor: brand.gold,
              border: 2,
              borderColor: 'background.paper',
              boxShadow: 1,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(best, { compact: true })}
          </Typography>
          {!degenerate && (
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(worst, { compact: true })}
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
}

export default PertRangeBar;
