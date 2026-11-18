import { describe, expect, it } from 'vitest';
import { ADMIN_ONLY_REASON, assignableRoles, manageBlockedReason, OWN_ROLE_REASON, roleChangeBlockedReason } from './userPermissions';

describe('userPermissions', () => {
  it('admins may assign every role, managers never admin', () => {
    expect(assignableRoles('admin')).toEqual(['admin', 'manager', 'user', 'viewer']);
    expect(assignableRoles('manager')).toEqual(['manager', 'user', 'viewer']);
    expect(assignableRoles(null)).not.toContain('admin');
  });

  it('only admins may change admin accounts', () => {
    expect(manageBlockedReason('admin', { role: 'admin' })).toBeUndefined();
    expect(manageBlockedReason('manager', { role: 'admin' })).toBe(ADMIN_ONLY_REASON);
    expect(manageBlockedReason('manager', { role: 'user' })).toBeUndefined();
    expect(manageBlockedReason('manager', { role: 'manager' })).toBeUndefined();
  });

  it('a manager cannot change their own role; an admin can', () => {
    expect(roleChangeBlockedReason('manager', true)).toBe(OWN_ROLE_REASON);
    expect(roleChangeBlockedReason('manager', false)).toBeUndefined();
    expect(roleChangeBlockedReason('admin', true)).toBeUndefined();
  });
});
