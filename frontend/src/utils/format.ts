const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'AUD';
const LOCALE = import.meta.env.VITE_LOCALE ?? 'en-AU';
export const formatCurrency = (v: number | null | undefined, opts: { compact?: boolean; maximumFractionDigits?: number } = {}) =>
  v == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY,
    notation: opts.compact ? 'compact' : 'standard', maximumFractionDigits: opts.maximumFractionDigits ?? (opts.compact ? 1 : 2) }).format(v);
export const formatNumber = (v: number | null | undefined) => v == null ? '—' : new Intl.NumberFormat(LOCALE).format(v);
export const formatPercent = (v: number | null | undefined, digits = 0) => v == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: digits }).format(v);
/**
 * Parse a timestamp from the API. The backend stores UTC but serialises it without a zone
 * ("2026-11-18T05:50:35.909"), which browsers read as local time, so such values are read as UTC.
 * Calendar dates ("2026-01-05" or "2026-01-05T00:00:00", used for start and finish dates) carry no
 * time of day and are kept on the same calendar day in every time zone.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.0+)?)?)?$/.exec(v);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(v);
  const date = new Date(/^\d{4}-\d{2}-\d{2}T/.test(v) && !hasZone ? `${v}Z` : v);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const formatDate = (iso: string | null | undefined) => {
  const d = parseApiDate(iso);
  return d ? new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(d) : '—';
};
export const formatDateTime = (iso: string | null | undefined) => {
  const d = parseApiDate(iso);
  return d ? new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(d) : '—';
};
