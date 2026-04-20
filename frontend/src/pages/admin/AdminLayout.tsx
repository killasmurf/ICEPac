/**
 * AdminLayout - Main layout with sidebar navigation for admin pages.
 */
import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/resources', label: 'Resources', icon: '📦' },
  { path: '/admin/suppliers', label: 'Suppliers', icon: '🏢' },
  { path: '/admin/config', label: 'Config Tables', icon: '⚙️' },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const sidebarWidth = collapsed ? '64px' : '240px';

  const s: Record<string, React.CSSProperties> = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' },
    sidebar: { width: sidebarWidth, backgroundColor: '#0f172a', color: '#fff', transition: 'width 0.2s', flexShrink: 0, display: 'flex', flexDirection: 'column' },
    brand: { padding: '20px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '12px' },
    brandText: { fontSize: '18px', fontWeight: 700, opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap' },
    toggle: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', padding: '4px' },
    nav: { padding: '12px 8px', flex: 1 },
    navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px', fontWeight: 500, marginBottom: '4px', transition: 'all 0.15s' },
    navItemActive: { backgroundColor: '#1e293b', color: '#fff' },
    main: { flex: 1, padding: '24px 32px', overflow: 'auto' },
  };

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div style={s.layout}>
      <div style={s.sidebar}>
        <div style={s.brand}>
          <button style={s.toggle} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
          <span style={s.brandText}>ICEPac Admin</span>
        </div>
        <nav style={s.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                ...s.navItem,
                ...(isActive(item.path, item.exact) ? s.navItemActive : {}),
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}
