import { createTheme, alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary'];
    navy: Palette['primary'];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
    navy?: PaletteOptions['primary'];
  }
}

// ─── Raw tokens ────────────────────────────────────────────────────────────────

const NAVY   = '#0F172A';
const BLUE   = '#3B82F6';
const BLUE_D = '#2563EB';
const BLUE_L = '#EFF6FF';

const SLATE_50  = '#F8FAFC';
const SLATE_100 = '#F1F5F9';
const SLATE_200 = '#E2E8F0';
const SLATE_400 = '#94A3B8';
const SLATE_500 = '#64748B';
const SLATE_700 = '#334155';
const SLATE_900 = '#0F172A';

const GREEN   = '#10B981';
const GREEN_L = '#ECFDF5';
const AMBER   = '#F59E0B';
const AMBER_L = '#FFFBEB';
const RED     = '#EF4444';
const RED_L   = '#FEF2F2';

const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

// ─── Theme ─────────────────────────────────────────────────────────────────────

const theme = createTheme({
  palette: {
    primary: {
      main:        BLUE,
      dark:        BLUE_D,
      light:       BLUE_L,
      contrastText: '#fff',
    },
    secondary: {
      main:        SLATE_700,
      contrastText: '#fff',
    },
    error: {
      main:  RED,
      light: RED_L,
    },
    warning: {
      main:  AMBER,
      light: AMBER_L,
    },
    success: {
      main:  GREEN,
      light: GREEN_L,
    },
    navy: {
      main:        NAVY,
      contrastText: '#fff',
    },
    neutral: {
      main:        SLATE_500,
      light:       SLATE_100,
      dark:        SLATE_700,
      contrastText: '#fff',
    },
    background: {
      default: SLATE_50,
      paper:   '#FFFFFF',
    },
    text: {
      primary:   SLATE_900,
      secondary: SLATE_500,
      disabled:  SLATE_400,
    },
    divider: SLATE_200,
  },

  typography: {
    fontFamily: FONT_SANS,
    fontWeightLight:   300,
    fontWeightRegular: 400,
    fontWeightMedium:  500,
    fontWeightBold:    700,

    h1: { fontSize: '2rem',    fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.5rem',  fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.125rem',fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1rem',    fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '0.875rem',fontWeight: 600, lineHeight: 1.5, letterSpacing: '0.01em' },

    subtitle1: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.6 },
    subtitle2: { fontSize: '0.8125rem',fontWeight: 500, lineHeight: 1.6, color: SLATE_500 },

    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem',  lineHeight: 1.6, color: SLATE_500 },

    caption: { fontSize: '0.75rem', letterSpacing: '0.02em', color: SLATE_500 },

    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: SLATE_400,
    },

    button: {
      fontWeight:    600,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: 10,
  },

  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.05)',
    '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    '0 25px 50px -12px rgba(0,0,0,0.25)',
    // 7-24: keep MUI defaults to avoid TS mismatch
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
    '0 1px 3px rgba(0,0,0,0.12)',
  ],

  components: {

    // ── Button ──────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 600,
          transition: 'background-color 180ms ease, box-shadow 180ms ease, transform 80ms ease',
          '&:active': { transform: 'scale(0.97)' },
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.12)' },
        },
        outlined: {
          borderColor: SLATE_200,
          '&:hover': { borderColor: BLUE, backgroundColor: BLUE_L },
        },
        sizeSmall:  { padding: '5px 12px', fontSize: '0.8125rem' },
        sizeLarge:  { padding: '11px 24px', fontSize: '1rem' },
      },
    },

    // ── IconButton ──────────────────────────────────────────────────────────
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'background-color 150ms ease, transform 80ms ease',
          '&:active': { transform: 'scale(0.92)' },
        },
      },
    },

    // ── Card ────────────────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${SLATE_200}`,
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
            borderColor: SLATE_200,
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '20px 24px', '&:last-child': { paddingBottom: '20px' } },
      },
    },

    // ── Paper ───────────────────────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' },
        elevation2: { boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)' },
        rounded:    { borderRadius: 14 },
      },
    },

    // ── TextField ───────────────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'box-shadow 150ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: SLATE_400 },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(BLUE, 0.12)}` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BLUE, borderWidth: 1.5 },
          '&.Mui-error .MuiOutlinedInput-notchedOutline':   { borderColor: RED },
        },
        notchedOutline: { borderColor: SLATE_200 },
      },
    },

    // ── Select ──────────────────────────────────────────────────────────────
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },

    // ── Chip ────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
          height: 24,
        },
        colorSuccess: { backgroundColor: GREEN_L,  color: '#065F46' },
        colorError:   { backgroundColor: RED_L,    color: '#991B1B' },
        colorWarning: { backgroundColor: AMBER_L,  color: '#92400E' },
        colorPrimary: { backgroundColor: BLUE_L,   color: BLUE_D },
        colorDefault: { backgroundColor: SLATE_100, color: SLATE_700 },
      },
    },

    // ── Table ───────────────────────────────────────────────────────────────
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: SLATE_50 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: SLATE_500,
          borderBottom: `1px solid ${SLATE_200}`,
          padding: '10px 16px',
        },
        body: {
          fontSize: '0.875rem',
          color: SLATE_900,
          borderBottom: `1px solid ${SLATE_100}`,
          padding: '12px 16px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 120ms ease',
          '&:hover': { backgroundColor: SLATE_50 },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },

    // ── AppBar ──────────────────────────────────────────────────────────────
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${SLATE_200}`,
          boxShadow: 'none',
        },
        colorPrimary: {
          backgroundColor: '#fff',
          color: SLATE_900,
        },
      },
    },

    // ── Drawer / Sidebar ─────────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${SLATE_200}`,
          boxShadow: 'none',
        },
      },
    },

    // ── List items (sidebar nav) ─────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
          transition: 'background-color 150ms ease, color 150ms ease',
          '&.Mui-selected': {
            backgroundColor: BLUE_L,
            color: BLUE_D,
            fontWeight: 600,
            '&:hover': { backgroundColor: alpha(BLUE, 0.12) },
          },
        },
      },
    },

    // ── Dialog ──────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '1.0625rem', padding: '20px 24px 12px' },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '8px 24px' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '16px 24px', gap: 8 },
      },
    },

    // ── Snackbar / Alert ──────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 500 },
        standardSuccess: { backgroundColor: GREEN_L, color: '#065F46' },
        standardError:   { backgroundColor: RED_L,   color: '#991B1B' },
        standardWarning: { backgroundColor: AMBER_L, color: '#92400E' },
        standardInfo:    { backgroundColor: BLUE_L,  color: BLUE_D },
      },
    },

    // ── Tooltip ──────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: SLATE_900,
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '5px 10px',
        },
        arrow: { color: SLATE_900 },
      },
    },

    // ── Tabs ─────────────────────────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.875rem',
          textTransform: 'none',
          minHeight: 44,
          '&.Mui-selected': { fontWeight: 600 },
        },
      },
    },

    // ── Skeleton ─────────────────────────────────────────────────────────────
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { borderRadius: 6, backgroundColor: SLATE_100 },
        wave: {
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.6)}, transparent)`,
          },
        },
      },
    },

    // ── Divider ──────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: SLATE_200 },
      },
    },

    // ── Avatar ───────────────────────────────────────────────────────────────
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
          backgroundColor: BLUE,
          color: '#fff',
        },
      },
    },

    // ── LinearProgress ───────────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6, backgroundColor: SLATE_100 },
        bar:  { borderRadius: 4 },
      },
    },

    // ── CircularProgress ─────────────────────────────────────────────────────
    MuiCircularProgress: {
      defaultProps: { size: 20, thickness: 4.5 },
    },

    // ── CssBaseline ──────────────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: `
        *, *::before, *::after { box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body { font-family: ${FONT_SANS}; }
        code, kbd, samp, pre { font-family: ${FONT_MONO}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${SLATE_50}; }
        ::-webkit-scrollbar-thumb { background: ${SLATE_200}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${SLATE_400}; }
      `,
    },
  },
});

export default theme;

// Re-export tokens for direct use in sx props and inline styles
export const tokens = {
  navy:     NAVY,
  blue:     BLUE,
  blueD:    BLUE_D,
  blueL:    BLUE_L,
  slate50:  SLATE_50,
  slate100: SLATE_100,
  slate200: SLATE_200,
  slate400: SLATE_400,
  slate500: SLATE_500,
  slate700: SLATE_700,
  slate900: SLATE_900,
  green:    GREEN,
  greenL:   GREEN_L,
  amber:    AMBER,
  amberL:   AMBER_L,
  red:      RED,
  redL:     RED_L,
  fontSans: FONT_SANS,
  fontMono: FONT_MONO,
} as const;
