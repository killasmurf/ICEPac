import { createTheme } from '@mui/material/styles';
import { brand, status, dark, radius } from './tokens';
import { components } from './components';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: {
      primary:   { main: brand.navy, dark: brand.navyDeep, light: brand.blue, contrastText: brand.white },
      secondary: { main: brand.gold, dark: brand.goldDark, light: brand.goldLight, contrastText: brand.navyDeep },
      success: { main: status.light.success }, warning: { main: status.light.warning },
      error: { main: status.light.error }, info: { main: status.light.info },
      background: { default: brand.mist, paper: brand.white },
      text: { primary: brand.navy, secondary: brand.slate },
      divider: brand.line,
    } },
    dark: { palette: {
      primary:   { main: brand.gold, dark: brand.goldDark, light: brand.goldLight, contrastText: brand.navyDeep },
      // Gold stays the key-action colour in dark mode (same as primary), so a
      // `color="secondary"` button is gold in both schemes.
      secondary: { main: brand.gold, dark: brand.goldDark, light: brand.goldLight, contrastText: brand.navyDeep },
      success: { main: status.dark.success }, warning: { main: status.dark.warning },
      error: { main: status.dark.error }, info: { main: status.dark.info },
      background: { default: dark.bg, paper: dark.paper },
      text: { primary: dark.text, secondary: dark.textMuted },
      divider: 'rgba(255,255,255,0.12)',
    } },
  },
  shape: { borderRadius: radius.md },
  typography: {
    fontFamily: '"Plus Jakarta Sans Variable","Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components,
});
export default theme;
