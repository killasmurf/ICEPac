/** Categorical series colours, in order. Every chart also needs a legend or direct labels. */
const series = ['#153351', '#C4A46F', '#004773', '#2F7FB3', '#86693A', '#5B8A72', '#8E6C8A', '#596872'] as const;

export const chartColors = {
  light: series,
  // On dark surfaces the navy first series is invisible, so it is swapped for the light blue.
  dark: ['#7FB8E0', ...series.slice(1)] as readonly string[],
} as const;
