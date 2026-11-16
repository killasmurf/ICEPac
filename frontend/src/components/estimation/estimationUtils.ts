import { formatCurrency } from '../../utils/format';

/** Currency symbol for the configured currency/locale, taken from the shared formatter so it can never drift. */
export function currencySymbol(): string {
  const symbol = formatCurrency(0).replace(/[\d\s.,-]/g, '');
  return symbol || '$';
}

/** Parse a form field. Returns null for empty or non-numeric text. */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const text = raw.trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export interface ThreePointInput {
  best: string | number;
  likely: string | number;
  worst: string | number;
}

export type ThreePointErrors = Partial<Record<'best' | 'likely' | 'worst', string>>;

/** best <= likely <= worst, all present and non-negative. Messages are shown as field helper text. */
export function validateThreePoint(input: ThreePointInput): ThreePointErrors {
  const errors: ThreePointErrors = {};
  const best = parseAmount(input.best);
  const likely = parseAmount(input.likely);
  const worst = parseAmount(input.worst);

  (['best', 'likely', 'worst'] as const).forEach((key) => {
    const v = { best, likely, worst }[key];
    if (v === null) errors[key] = 'Enter an amount';
    else if (v < 0) errors[key] = 'Must be 0 or more';
  });

  if (!errors.best && !errors.likely && best! > likely!) errors.best = 'Best must not be more than likely';
  if (!errors.likely && !errors.worst && likely! > worst!) errors.worst = 'Worst must not be less than likely';
  if (!errors.best && !errors.worst && best! > worst!) errors.worst = 'Worst must not be less than best';
  return errors;
}

/** 0-100 percentage field. */
export function validatePercent(raw: string | number): string | undefined {
  const v = parseAmount(raw);
  if (v === null) return 'Enter a percentage';
  if (v < 0 || v > 100) return 'Must be between 0 and 100';
  return undefined;
}

/** Non-negative money field. */
export function validateMoney(raw: string | number): string | undefined {
  const v = parseAmount(raw);
  if (v === null) return 'Enter an amount';
  if (v < 0) return 'Must be 0 or more';
  return undefined;
}

export interface RangeBarProps {
  best: number;
  likely: number;
  worst: number;
  pert: number;
  low80: number;
  high80: number;
}

/**
 * Range-bar inputs for a summary that only carries a PERT total, a standard deviation and the 80% interval.
 * PERT defines sigma as (worst - best) / 6, so the bar spans PERT +/- 3 sigma (floored at zero) with the 80%
 * interval shaded. The figures themselves come from the backend unchanged.
 */
export function summaryRangeBar(s: {
  total_pert_estimate: number;
  total_std_deviation: number;
  confidence_80_low: number;
  confidence_80_high: number;
}): RangeBarProps {
  const half = 3 * Math.abs(s.total_std_deviation);
  return {
    best: Math.max(0, s.total_pert_estimate - half),
    likely: s.total_pert_estimate,
    worst: s.total_pert_estimate + half,
    pert: s.total_pert_estimate,
    low80: s.confidence_80_low,
    high80: s.confidence_80_high,
  };
}
