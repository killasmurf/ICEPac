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

export interface BreakdownInput {
  code: string;
  name: string;
  total_pert: number;
  assignment_count: number;
}

export interface BreakdownShare extends BreakdownInput {
  /** Percentage of the breakdown total, to one decimal place. Shares add up to exactly 100 (0 when the total is 0). */
  share: number;
  /** True for the row that groups everything beyond `maxRows`. */
  isOther?: boolean;
}

export interface RankedBreakdown {
  rows: BreakdownShare[];
  total: number;
  /** True when every item is 0 (or there are none): there is nothing to draw. */
  empty: boolean;
}

/**
 * Sort a cost breakdown from largest to smallest and attach each row's share of the total.
 * Beyond `maxRows` rows the tail is grouped into one "Other" row so a chart keeps a readable number of slices.
 * Shares use the largest-remainder method on tenths of a percent, so they sum to exactly 100.
 */
export function rankBreakdown(items: BreakdownInput[], maxRows = 7): RankedBreakdown {
  const clean = items.map((i) => ({ ...i, total_pert: Math.max(0, Number.isFinite(i.total_pert) ? i.total_pert : 0) }));
  clean.sort((a, b) => b.total_pert - a.total_pert || a.name.localeCompare(b.name));

  let rows: Omit<BreakdownShare, 'share'>[] = clean;
  if (clean.length > maxRows) {
    const head = clean.slice(0, maxRows - 1);
    const tail = clean.slice(maxRows - 1);
    rows = [
      ...head,
      {
        code: 'OTHER',
        name: `Other (${tail.length})`,
        total_pert: tail.reduce((s, r) => s + r.total_pert, 0),
        assignment_count: tail.reduce((s, r) => s + r.assignment_count, 0),
        isOther: true,
      },
    ];
  }

  const total = rows.reduce((s, r) => s + r.total_pert, 0);
  if (total <= 0) return { rows: rows.map((r) => ({ ...r, share: 0 })), total: 0, empty: true };

  const raw = rows.map((r) => (r.total_pert / total) * 1000);
  const tenths = raw.map(Math.floor);
  let left = 1000 - tenths.reduce((s, v) => s + v, 0);
  raw
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (left > 0) {
        tenths[i] += 1;
        left -= 1;
      }
    });
  return { rows: rows.map((r, i) => ({ ...r, share: tenths[i] / 10 })), total, empty: false };
}

interface StatusNode {
  id: number;
  approval_status: string;
  children: StatusNode[];
}

/** Copy of a WBS tree response with one node's approval status replaced (used for optimistic updates). */
export function withNodeApprovalStatus<N extends StatusNode, R extends { items: N[] }>(response: R, wbsId: number, status: string): R {
  const walk = (nodes: N[]): N[] =>
    nodes.map((n) => ({ ...n, approval_status: n.id === wbsId ? status : n.approval_status, children: walk(n.children as N[]) }));
  return { ...response, items: walk(response.items) };
}

/** The `n` WBS items with the largest PERT estimate. */
export function topWbsByEstimate<T extends { total_pert_estimate: number }>(items: T[], n = 10): T[] {
  return [...items].sort((a, b) => b.total_pert_estimate - a.total_pert_estimate).slice(0, n);
}
