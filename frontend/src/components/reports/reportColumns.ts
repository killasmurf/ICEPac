/**
 * Decide how each report column is displayed. The backend sends only {key, label}, so the kind is
 * inferred from the key, the label and the actual values.
 */
import type { ReportColumn, ReportRow } from '../../api/reports';
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/format';

export type ColumnKind = 'money' | 'number' | 'datetime' | 'text';

const ID_KEY = /(^id$|_id$|code$)/;
const COUNT_KEY = /(count|assignments|items)$/;
const MONEY_KEY = /(total|estimate|exposure|std_dev|confidence|cost|amount|budget)/;
const DATE_KEY = /(timestamp|_at$|_date$|^date)/;

function isDateString(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Classify a column from its key, label and the values in the rows (and totals). */
export function columnKind(column: ReportColumn, rows: ReportRow[], totals?: ReportRow | null): ColumnKind {
  const values = [...rows.map((r) => r[column.key]), totals?.[column.key]].filter((v) => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return 'text';
  if (values.every((v) => typeof v === 'number')) {
    if (ID_KEY.test(column.key)) return 'text';
    if (COUNT_KEY.test(column.key)) return 'number';
    if (column.label.includes('$') || MONEY_KEY.test(column.key)) return 'money';
    return 'number';
  }
  if (DATE_KEY.test(column.key) && values.every(isDateString)) return 'datetime';
  return 'text';
}

/** Format a cell for display according to its column kind. */
export function formatCell(kind: ColumnKind, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (kind === 'money' && typeof value === 'number') return formatCurrency(value);
  if (kind === 'number' && typeof value === 'number') return formatNumber(value);
  if (kind === 'datetime' && typeof value === 'string') return formatDateTime(value);
  return String(value);
}

export const isNumericKind = (kind: ColumnKind): boolean => kind === 'money' || kind === 'number';
