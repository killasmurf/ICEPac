export const brand = {
  navy: '#153351', navyDeep: '#0A1928', blue: '#004773',
  gold: '#C4A46F', goldDark: '#A88B5A', goldText: '#86693A', goldLight: '#D9C49C',
  slate: '#596872', mist: '#F5F7F9', line: '#DCE3E8', white: '#FFFFFF',
} as const;
export const status = {
  light: { success: '#1F7A55', warning: '#B45309', error: '#B3261E', info: '#004773' },
  dark:  { success: '#5CC49A', warning: '#F0B35A', error: '#F28B82', info: '#7FB8E0' },
} as const;
export const dark = { bg: '#0A1928', paper: '#10263D', raised: '#153351', text: '#E6ECF1', textMuted: '#9FB0BF' } as const;
export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const;
export const layout = { sidebarWidth: 248, sidebarRail: 72, headerHeight: 64, contentMaxWidth: 1440 } as const;
export const motion = { fast: 120, base: 200, slow: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' } as const;
