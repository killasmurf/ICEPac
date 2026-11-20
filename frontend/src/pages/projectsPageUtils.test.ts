import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SORT_OPTIONS,
  VIEW_STORAGE_KEY,
  defaultOrder,
  readQueryState,
  readStoredView,
  sortSelectValue,
  storeView,
  toCreateBody,
  toSkip,
  toUpdateBody,
  validateProjectName,
  writeQueryState,
} from './projectsPageUtils';

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

describe('URL query state', () => {
  it('reads valid values and drops unknown ones', () => {
    expect(readQueryState(new URLSearchParams('archived=1&status=draft&sort=name&order=desc'))).toEqual({
      archived: true,
      status: 'draft',
      sort: 'name',
      order: 'desc',
    });
    expect(readQueryState(new URLSearchParams('archived=0&status=nope&sort=x&order=up'))).toEqual({
      archived: false,
      status: undefined,
      sort: undefined,
      order: undefined,
    });
  });

  it('ignores order without a valid sort', () => {
    expect(readQueryState(new URLSearchParams('order=asc')).order).toBeUndefined();
  });

  it('writes state, keeps unrelated keys and removes cleared ones', () => {
    const next = writeQueryState(new URLSearchParams('new=1&sort=name&order=asc&status=draft'), {
      archived: true,
      status: undefined,
      sort: 'manager',
      order: 'desc',
    });
    expect(next.get('new')).toBe('1');
    expect(next.get('archived')).toBe('1');
    expect(next.get('sort')).toBe('manager');
    expect(next.get('order')).toBe('desc');
    expect(next.has('status')).toBe(false);
    const cleared = writeQueryState(next, { archived: false, status: undefined, sort: undefined, order: undefined });
    expect(cleared.toString()).toBe('new=1');
  });
});

describe('sort options', () => {
  it('uses the server default directions', () => {
    expect(defaultOrder('name')).toBe('asc');
    expect(defaultOrder('updated_at')).toBe('desc');
    expect(sortSelectValue({ sort: undefined, order: undefined })).toBe('updated_at:desc');
    expect(sortSelectValue({ sort: 'name', order: undefined })).toBe('name:asc');
  });

  it('offers both directions of every field with unique values', () => {
    expect(SORT_OPTIONS).toHaveLength(10);
    expect(new Set(SORT_OPTIONS.map((o) => o.value)).size).toBe(10);
    expect(SORT_OPTIONS.map((o) => o.label)).toContain('Name Z to A');
  });
});
