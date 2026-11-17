import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { formatNumber } from '../../utils/format';
import { visuallyHidden } from './visuallyHidden';

export interface AnimatedNumberProps {
  value: number;
  /** Renders a number as text, e.g. `(v) => formatCurrency(v, { compact: true })`. Defaults to `formatNumber`. */
  format?: (value: number) => string;
  /** Count-up time in milliseconds. */
  duration?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts from the previous value to the new one with an ease-out curve. Under
 * `prefers-reduced-motion: reduce` the final value is rendered immediately.
 * Screen readers always get the final value, never an intermediate one.
 */
export function AnimatedNumber({ value, format = formatNumber, duration = 600 }: AnimatedNumberProps) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [display, setDisplay] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      shown.current = t >= 1 ? value : from + (value - from) * easeOutCubic(t);
      setDisplay(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduceMotion]);

  const visible = reduceMotion ? value : display;
  return (
    <>
      <span aria-hidden="true">{format(visible)}</span>
      <Box component="span" sx={visuallyHidden}>
        {format(value)}
      </Box>
    </>
  );
}

export default AnimatedNumber;
