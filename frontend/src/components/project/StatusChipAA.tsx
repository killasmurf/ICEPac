import Box from '@mui/material/Box';
import StatusChip, { type StatusChipProps } from '../common/StatusChip';

/**
 * StatusChip with slightly darker text on light backgrounds.
 * The shared chip's semantic text on its 12% tint measures about 4.5:1 or less
 * (axe color-contrast); darkening 20% keeps the hue and clears AA. Dark mode is untouched.
 */
export function StatusChipAA({ kind, value }: Pick<StatusChipProps, 'kind' | 'value'>) {
  return (
    <Box
      component="span"
      sx={(theme) => {
        const p = (theme.vars ?? theme).palette;
        const darken = (c: string) => `color-mix(in srgb, ${c} 78%, ${p.common.black})`;
        return {
          display: 'inline-flex',
          ...theme.applyStyles('light', {
            '& .MuiChip-root[data-tone="success"]': { color: darken(p.success.main) },
            '& .MuiChip-root[data-tone="info"]': { color: darken(p.info.main) },
            '& .MuiChip-root[data-tone="warning"]': { color: darken(p.warning.main) },
            '& .MuiChip-root[data-tone="error"]': { color: darken(p.error.main) },
          }),
        };
      }}
    >
      <StatusChip kind={kind} value={value} />
    </Box>
  );
}

export default StatusChipAA;
