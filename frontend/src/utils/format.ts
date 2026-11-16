const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'AUD';
const LOCALE = import.meta.env.VITE_LOCALE ?? 'en-AU';
export const formatCurrency = (v: number | null | undefined, opts: { compact?: boolean; maximumFractionDigits?: number } = {}) =>
  v == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY,
    notation: opts.compact ? 'compact' : 'standard', maximumFractionDigits: opts.maximumFractionDigits ?? (opts.compact ? 1 : 2) }).format(v);
export const formatNumber = (v: number | null | undefined) => v == null ? '—' : new Intl.NumberFormat(LOCALE).format(v);
export const formatPercent = (v: number | null | undefined, digits = 0) => v == null ? '—' : new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: digits }).format(v);
export const formatDate = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';
export const formatDateTime = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';
