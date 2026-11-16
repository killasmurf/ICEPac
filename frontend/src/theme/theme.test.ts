import type { CssVarsTheme } from '@mui/material/styles';
import baseTheme from './index';
import { chartColors } from './charts';

// createTheme() is typed as Theme even with cssVariables on; colorSchemes exists at runtime.
const theme = baseTheme as unknown as typeof baseTheme & Pick<CssVarsTheme, 'colorSchemes'>;

describe('theme', () => {
  it('uses the Adalex palette in light and dark schemes', () => {
    expect(theme.colorSchemes.light?.palette.primary.main).toBe('#153351');
    expect(theme.colorSchemes.dark?.palette.primary.main).toBe('#C4A46F');
    expect(theme.colorSchemes.dark?.palette.background.default).toBe('#0A1928');
    expect(theme.colorSchemes.light?.palette.background.default).toBe('#F5F7F9');
  });

  it('uses Plus Jakarta Sans', () => {
    expect(theme.typography.fontFamily).toMatch(/^"Plus Jakarta Sans/);
  });

  it('swaps the first chart colour in dark mode', () => {
    expect(chartColors.light[0]).toBe('#153351');
    expect(chartColors.dark[0]).toBe('#7FB8E0');
    expect(chartColors.dark).toHaveLength(chartColors.light.length);
  });
});
