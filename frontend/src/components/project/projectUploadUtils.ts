import type { ImportJob } from '../../api/projects';

/** Mirrors app/utils/validators.py (ALLOWED_EXTENSIONS, DEFAULT_MAX_FILE_SIZE, MIN_FILE_SIZE). */
export const ALLOWED_EXTENSIONS = ['.mpp', '.mpx', '.xml'] as const;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MIN_FILE_BYTES = 100;

/** Import job statuses from the backend ImportStatus enum. */
export const TERMINAL_STATUSES = ['completed', 'failed'] as const;

export const JOB_STATUS_DETAIL: Record<string, string> = {
  pending: 'Waiting to start',
  uploading: 'Uploading the file',
  parsing: 'Reading the project file',
  creating_records: 'Creating WBS records',
  completed: 'Import completed',
  failed: 'Import failed',
};

export function isTerminalStatus(status: string | null | undefined): boolean {
  return status != null && (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateUploadFile(file: { name: string; size: number }): string | null {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ext) {
    return `"${file.name}" has no file extension. Supported types: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Invalid file type "${ext}". Supported types: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }
  if (file.size < MIN_FILE_BYTES) {
    return `File is too small (${formatFileSize(file.size)}). It looks empty or corrupt.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_BYTES)}.`;
  }
  return null;
}

/** Extract the FastAPI `detail` string from an axios-style error, with a fallback. */
export function uploadErrorMessage(err: unknown, fallback = 'Upload failed. Please try again.'): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}

export function jobProgress(job: Pick<ImportJob, 'progress'>): number {
  return Math.max(0, Math.min(100, Math.round(job.progress ?? 0)));
}
