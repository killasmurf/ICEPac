/**
 * The API serialises Decimal fields as JSON strings ("12000.00"). Convert such a value to a finite number.
 * Returns null for null/undefined, empty or non-numeric input, so callers decide the fallback.
 */
export function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const text = v.trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Like toNumber but falls back to 0, for required numeric fields. */
export function toNumberOr0(v: string | number | null | undefined): number {
  return toNumber(v) ?? 0;
}

/** "1 assignment", "2 assignments". Pass `plural` for irregular nouns. */
export function pluralise(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
