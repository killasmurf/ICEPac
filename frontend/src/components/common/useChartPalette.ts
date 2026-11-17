import { useColorScheme, useTheme } from '@mui/material/styles';
import { chartColors } from '../../theme/charts';

/** Categorical series colours for the current colour scheme. */
export function useChartPalette(): readonly string[] {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? chartColors.dark : chartColors.light;
}

/** Status colours from the theme palette, for charts that encode approval state rather than category. */
export function useApprovalColors() {
  const { palette } = useTheme();
  return {
    approved: palette.success.main,
    submitted: palette.warning.main,
    rejected: palette.error.main,
    draft: palette.text.secondary,
    empty: palette.divider,
  };
}
