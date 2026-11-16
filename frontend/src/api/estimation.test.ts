import { describe, expect, it } from 'vitest';
import { calculate80ConfidenceInterval, calculatePERT, calculateStdDeviation } from './estimation';

// These tests pin the current behaviour of the PERT helpers. The UI only displays them
// (live form previews); backend-supplied totals are authoritative. Do not change the
// expected numbers without changing the backend model as well.
describe('calculatePERT', () => {
  it('weights the likely value four times: (best + 4*likely + worst) / 6', () => {
    expect(calculatePERT(100, 200, 400)).toBe(250);
    expect(calculatePERT(0, 0, 0)).toBe(0);
    expect(calculatePERT(10, 10, 10)).toBe(10);
    expect(calculatePERT(60, 120, 240)).toBe(130);
  });

  it('does not validate or reorder its inputs', () => {
    expect(calculatePERT(400, 200, 100)).toBe(250);
    expect(calculatePERT(-60, 0, 60)).toBe(0);
  });

  it('keeps fractional results unrounded', () => {
    expect(calculatePERT(1, 2, 4)).toBeCloseTo(13 / 6, 12);
    expect(calculatePERT(0.1, 0.2, 0.4)).toBeCloseTo(1.3 / 6, 12);
  });
});

describe('calculateStdDeviation', () => {
  it('is (worst - best) / 6', () => {
    expect(calculateStdDeviation(100, 400)).toBe(50);
    expect(calculateStdDeviation(0, 0)).toBe(0);
    expect(calculateStdDeviation(10, 10)).toBe(0);
  });

  it('goes negative when worst < best (no clamping)', () => {
    expect(calculateStdDeviation(400, 100)).toBe(-50);
  });
});

describe('calculate80ConfidenceInterval', () => {
  it('uses z = 1.28 either side of the PERT estimate', () => {
    const { low, high } = calculate80ConfidenceInterval(250, 50);
    expect(low).toBeCloseTo(186, 10);
    expect(high).toBeCloseTo(314, 10);
  });

  it('collapses to the PERT estimate when the deviation is zero', () => {
    expect(calculate80ConfidenceInterval(1000, 0)).toEqual({ low: 1000, high: 1000 });
  });

  it('is symmetric and not clamped at zero', () => {
    const { low, high } = calculate80ConfidenceInterval(10, 100);
    expect(low).toBeCloseTo(-118, 10);
    expect(high).toBeCloseTo(138, 10);
    expect(10 - low).toBeCloseTo(high - 10, 10);
  });

  it('composes with the other helpers for a worked example', () => {
    const pert = calculatePERT(100, 200, 400);
    const sd = calculateStdDeviation(100, 400);
    const { low, high } = calculate80ConfidenceInterval(pert, sd);
    expect([pert, sd]).toEqual([250, 50]);
    expect(low).toBeCloseTo(186, 10);
    expect(high).toBeCloseTo(314, 10);
  });
});
