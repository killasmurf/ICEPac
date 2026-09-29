/**
 * Admin area design tokens — sourced from the same values as the MUI theme.
 * Used in the admin pages that rely on inline CSSProperties styles.
 */

export const adminTokens = {
  // Colours
  navy:       '#0F172A',
  blue:       '#3B82F6',
  blueD:      '#2563EB',
  blueL:      '#EFF6FF',

  slate50:    '#F8FAFC',
  slate100:   '#F1F5F9',
  slate200:   '#E2E8F0',
  slate300:   '#CBD5E1',
  slate400:   '#94A3B8',
  slate500:   '#64748B',
  slate600:   '#475569',
  slate700:   '#334155',
  slate800:   '#1E293B',
  slate900:   '#0F172A',

  green:      '#10B981',
  greenL:     '#ECFDF5',
  greenD:     '#065F46',
  amber:      '#F59E0B',
  amberL:     '#FFFBEB',
  amberD:     '#92400E',
  red:        '#EF4444',
  redL:       '#FEF2F2',
  redD:       '#991B1B',

  // Typography
  fontSans:   "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontMono:   "'JetBrains Mono', 'Fira Code', monospace",

  // Sizing
  radiusSm:   '6px',
  radiusMd:   '10px',
  radiusLg:   '14px',
  radiusXl:   '16px',

  // Shadows
  shadowSm:   '0 1px 2px rgba(0,0,0,0.05)',
  shadowMd:   '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  shadowLg:   '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',

  // Transitions
  transition: 'all 150ms ease',
} as const;

export type AdminTokens = typeof adminTokens;
