import { afterEach, describe, expect, it, vi } from 'vitest';
import { VIEW_STORAGE_KEY, readStoredView, storeView, toCreateBody, toSkip, toUpdateBody, validateProjectName } from './projectsPageUtils';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('view persistence', () => {
  it('defaults to cards and round-trips the table choice', () => {
    expect(readStoredView()).toBe('cards');
    storeView('table');
    expect(window.localStorage.getItem(VIEW_STORAGE_KEY)).toBe('table');
    expect(readStoredView()).toBe('table');
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredView()).toBe('cards');
    expect(() => storeView('table')).not.toThrow();
  });
});

describe('form helpers', () => {
  it('validates the name', () => {
    expect(validateProjectName('   ')).toBe('Project name is required');
    expect(validateProjectName('x'.repeat(256))).toContain('255');
    expect(validateProjectName(' Bridge ')).toBeNull();
  });

  it('omits blank optional fields on create', () => {
    expect(toCreateBody({ project_name: ' A ', project_manager: '', description: ' ' })).toEqual({ project_name: 'A' });
    expect(toCreateBody({ project_name: 'A', project_manager: 'Jo', description: 'd' })).toEqual({
      project_name: 'A',
      project_manager: 'Jo',
      description: 'd',
    });
  });

  it('clears blank optional fields on update', () => {
    expect(toUpdateBody({ project_name: 'A', project_manager: '', description: '' })).toEqual({
      project_name: 'A',
      project_manager: null,
      description: null,
    });
  });

  it('computes skip', () => {
    expect(toSkip(0, 10)).toBe(0);
    expect(toSkip(3, 12)).toBe(36);
    expect(toSkip(-1, 10)).toBe(0);
  });
});
