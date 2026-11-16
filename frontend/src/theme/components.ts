import type { Components, Theme } from '@mui/material/styles';
import { brand, radius } from './tokens';

/** Scheme-safe tokens: CSS variables when available, plain palette otherwise (theme.vars is optional in the types). */
const tk = (theme: Theme) => theme.vars ?? theme;

export const components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: (theme) => ({
      body: { fontFeatureSettings: 'normal' },
      '.tabular-nums': { fontVariantNumeric: 'tabular-nums' },
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': {
          animationDuration: '0.01ms !important',
          transitionDuration: '0.01ms !important',
        },
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: `${tk(theme).palette.divider} transparent`,
      },
      '*::-webkit-scrollbar': { width: 8, height: 8 },
      '*::-webkit-scrollbar-thumb': { backgroundColor: tk(theme).palette.divider, borderRadius: radius.pill },
    }),
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: { borderRadius: radius.md, minHeight: 40 },
      containedSecondary: { '&:hover': { backgroundColor: brand.goldDark } },
    },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: 'none' },
      elevation0: ({ theme }) => ({ border: `1px solid ${tk(theme).palette.divider}` }),
    },
  },
  MuiCard: {
    defaultProps: { variant: 'outlined' },
    styleOverrides: { root: { borderRadius: radius.lg } },
  },
  MuiAppBar: {
    defaultProps: { elevation: 0, color: 'inherit' },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: tk(theme).palette.background.paper,
        color: tk(theme).palette.text.primary,
        borderWidth: 0,
        borderBottom: `1px solid ${tk(theme).palette.divider}`,
      }),
    },
  },
  MuiTextField: { defaultProps: { size: 'small' } },
  MuiSelect: { defaultProps: { size: 'small' } },
  MuiFormControl: { defaultProps: { size: 'small' } },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: radius.md,
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: tk(theme).palette.primary.main,
          borderWidth: 2,
        },
      }),
    },
  },
  MuiChip: {
    styleOverrides: { root: { borderRadius: radius.pill, fontWeight: 600 } },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({ borderBottomColor: tk(theme).palette.divider }),
      head: ({ theme }) => ({
        fontWeight: 600,
        color: tk(theme).palette.text.secondary,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.04em',
      }),
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: { backgroundColor: brand.navyDeep, color: brand.white },
      arrow: { color: brand.navyDeep },
    },
  },
  MuiDialog: {
    styleOverrides: { paper: { borderRadius: radius.lg } },
  },
  MuiTab: {
    styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
  },
  MuiLink: { defaultProps: { underline: 'hover' } },
  MuiListItemButton: {
    styleOverrides: { root: { borderRadius: radius.md } },
  },
};
