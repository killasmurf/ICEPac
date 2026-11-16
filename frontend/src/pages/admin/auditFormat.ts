/**
 * Pretty-print an audit log old/new value for the detail drawer.
 * The API sends a JSON object, but older rows may hold a JSON string or free text.
 */
export function formatAuditValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Known actions the audit service writes (app/models/database/audit_log.py AuditAction). */
export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'FAILED_LOGIN',
  'PASSWORD_CHANGE',
  'ROLE_CHANGE',
  'EXPORT',
  'IMPORT',
] as const;

/** "FAILED_LOGIN" -> "Failed login". */
export function formatActionLabel(action: string): string {
  const text = action.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
