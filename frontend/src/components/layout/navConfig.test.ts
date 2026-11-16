import { describe, it, expect } from 'vitest';
import { getVisibleSections, isNavActive, navSections } from './navConfig';

const item = (path: string) => navSections.flatMap((s) => s.items).find((i) => i.path === path)!;

describe('navConfig', () => {
  it('hides Administration for non-admins', () => {
    expect(getVisibleSections('user').map((s) => s.id)).toEqual(['workspace', 'support']);
    expect(getVisibleSections('admin').map((s) => s.id)).toEqual(['workspace', 'admin', 'support']);
  });
  it('matches nested paths except exact items', () => {
    expect(isNavActive(item('/projects'), '/projects/1')).toBe(true);
    expect(isNavActive(item('/projects'), '/projectsx')).toBe(false);
    expect(isNavActive(item('/'), '/projects')).toBe(false);
    expect(isNavActive(item('/admin'), '/admin/users')).toBe(false);
    expect(isNavActive(item('/admin/users'), '/admin/users')).toBe(true);
  });
});
