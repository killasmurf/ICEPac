import { describe, it, expect } from 'vitest';
import { getVisibleSections, isNavActive, navSections } from './navConfig';

const item = (path: string) => navSections.flatMap((s) => s.items).find((i) => i.path === path)!;

describe('navConfig', () => {
  it('shows Administration to admins and managers only', () => {
    expect(getVisibleSections('user').map((s) => s.id)).toEqual(['workspace', 'support']);
    expect(getVisibleSections('viewer').map((s) => s.id)).toEqual(['workspace', 'support']);
    expect(getVisibleSections(null).map((s) => s.id)).toEqual(['workspace', 'support']);
    expect(getVisibleSections('manager').map((s) => s.id)).toEqual(['workspace', 'admin', 'support']);
    expect(getVisibleSections('admin').map((s) => s.id)).toEqual(['workspace', 'admin', 'support']);
  });
  it('hides Audit Logs from managers', () => {
    const labels = (r: 'admin' | 'manager') => getVisibleSections(r).find((s) => s.id === 'admin')!.items.map((i) => i.label);
    expect(labels('admin')).toContain('Audit Logs');
    expect(labels('manager')).toEqual(['Overview', 'Users', 'Resources', 'Suppliers', 'Config Tables']);
  });
  it('matches nested paths except exact items', () => {
    expect(isNavActive(item('/projects'), '/projects/1')).toBe(true);
    expect(isNavActive(item('/projects'), '/projectsx')).toBe(false);
    expect(isNavActive(item('/'), '/projects')).toBe(false);
    expect(isNavActive(item('/admin'), '/admin/users')).toBe(false);
    expect(isNavActive(item('/admin/users'), '/admin/users')).toBe(true);
  });
});
