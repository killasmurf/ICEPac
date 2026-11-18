import type { UserRole } from '../../api/admin';

/** Tooltip for admin-account rows a manager may not change (the API answers 403 for these). */
export const ADMIN_ONLY_REASON = 'Only administrators can change administrator accounts';
export const OWN_ROLE_REASON = 'You cannot change your own role';

const ALL_ROLES: UserRole[] = ['admin', 'manager', 'user', 'viewer'];

/** Roles the actor may give to a user. Managers can never grant admin; admins can grant anything. */
export function assignableRoles(actor: UserRole | null): UserRole[] {
  return actor === 'admin' ? ALL_ROLES : ALL_ROLES.filter((r) => r !== 'admin');
}

/** Why the actor may not edit, deactivate, reset the password of, or delete this account; undefined when they may. */
export function manageBlockedReason(actor: UserRole | null, target: { role: UserRole }): string | undefined {
  if (actor !== 'admin' && target.role === 'admin') return ADMIN_ONLY_REASON;
  return undefined;
}

/** A manager cannot change their own role (that is how a manager could promote themselves). */
export function roleChangeBlockedReason(actor: UserRole | null, isSelf: boolean): string | undefined {
  return actor !== 'admin' && isSelf ? OWN_ROLE_REASON : undefined;
}
