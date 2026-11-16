import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_BYTES,
  formatFileSize,
  isTerminalStatus,
  jobProgress,
  uploadErrorMessage,
  validateUploadFile,
} from './projectUploadUtils';

describe('validateUploadFile', () => {
  it.each(['plan.mpp', 'plan.MPX', 'export.xml'])('accepts %s', (name) => {
    expect(validateUploadFile({ name, size: 5000 })).toBeNull();
  });

  it('rejects an unsupported extension and lists the supported ones', () => {
    const msg = validateUploadFile({ name: 'sheet.xlsx', size: 5000 });
    expect(msg).toContain('".xlsx"');
    expect(msg).toContain('.mpp, .mpx, .xml');
  });

  it('rejects a file with no extension', () => {
    expect(validateUploadFile({ name: 'README', size: 5000 })).toContain('no file extension');
  });

  it('rejects empty or tiny files', () => {
    expect(validateUploadFile({ name: 'a.mpp', size: 10 })).toContain('too small');
  });

  it('rejects files over 100 MB but allows exactly 100 MB', () => {
    expect(validateUploadFile({ name: 'a.mpp', size: MAX_FILE_BYTES })).toBeNull();
    expect(validateUploadFile({ name: 'a.mpp', size: MAX_FILE_BYTES + 1 })).toContain('too large');
  });
});

describe('helpers', () => {
  it('formats file sizes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatFileSize(null)).toBe('—');
  });

  it('knows terminal statuses', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('parsing')).toBe(false);
    expect(isTerminalStatus(undefined)).toBe(false);
  });

  it('reads the backend error detail', () => {
    expect(uploadErrorMessage({ response: { data: { detail: 'Invalid file: nope' } } })).toBe('Invalid file: nope');
    expect(uploadErrorMessage(new Error('x'))).toBe('Upload failed. Please try again.');
    expect(uploadErrorMessage({ response: { data: { detail: [{ msg: 'x' }] } } })).toBe('Upload failed. Please try again.');
  });

  it('clamps job progress', () => {
    expect(jobProgress({ progress: 42.4 })).toBe(42);
    expect(jobProgress({ progress: 140 })).toBe(100);
    expect(jobProgress({ progress: -5 })).toBe(0);
  });
});
