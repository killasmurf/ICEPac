/** Categorical series colours, in order. Every chart also needs a legend or direct labels. */
const series = ['#153351', '#C4A46F', '#004773', '#2F7FB3', '#86693A', '#5B8A72', '#8E6C8A', '#596872'] as const;

export const chartColors = {
  light: series,
  // On the dark card surface (#10263D) navy, deep blue and slate fall below 3:1, so they are
  // swapped for lighter tones. Every dark series colour is at least 3:1 against the card.
  dark: ['#7FB8E0', '#C4A46F', '#B39AD1', '#2F7FB3', '#86693A', '#5B8A72', '#8E6C8A', '#9FB0BF'] as readonly string[],
} as const;
