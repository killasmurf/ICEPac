import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import ErrorState from '../components/common/ErrorState';
import { useAuth } from './AuthContext';
import type { Role } from './token';

/** Layout route: redirects to /login?next=<path> when there is no unexpired token. */
export const RequireAuth: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, signedOut } = useAuth();
  const { pathname, search } = useLocation();
  if (!isAuthenticated) {
    const next = signedOut ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return <Navigate to={`/login${next}`} replace />;
  }
  return <>{children ?? <Outlet />}</>;
};

interface RequireRoleProps {
  role: Role | Role[];
  children?: React.ReactNode;
}

/** Layout route: renders a "Not authorised" state unless the JWT role matches. */
export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { role: current } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (!current || !allowed.includes(current)) {
    return (
      <ErrorState
        title="Not authorised"
        description="You do not have permission to view this page. Ask an administrator if you need access."
      />
    );
  }
  return <>{children ?? <Outlet />}</>;
};

export default RequireAuth;
