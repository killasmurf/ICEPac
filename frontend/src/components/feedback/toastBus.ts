/**
 * Tiny module-level emitter that lets non-React code (the query client) raise
 * toasts without importing React context. ToastProvider registers a handler.
 */
export type ToastSeverity = 'success' | 'error' | 'info';
export type ToastHandler = (severity: ToastSeverity, message: string) => void;

let handler: ToastHandler | null = null;

/** Register the active handler. Returns an unsubscribe function. */
export function registerToastHandler(next: ToastHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/** Emit a toast. Silently does nothing when no ToastProvider is mounted. */
export function emitToast(severity: ToastSeverity, message: string): void {
  handler?.(severity, message);
}

/** Best-effort human message from an unknown thrown value (axios-aware, no axios import). */
export function errorMessage(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
