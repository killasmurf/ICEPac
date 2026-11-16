import React from 'react';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { Role } from '../../auth/token';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  /** Active only on an exact path match (used for `/` and `/admin`). */
  exact?: boolean;
}

export interface NavSection {
  id: 'workspace' | 'admin' | 'support';
  label: string;
  /** When set, the section is only visible to these roles. */
  roles?: Role[];
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { label: 'Dashboard', path: '/', icon: <DashboardOutlinedIcon />, exact: true },
      { label: 'Projects', path: '/projects', icon: <FolderOutlinedIcon /> },
      { label: 'Reports', path: '/reports', icon: <AssessmentOutlinedIcon /> },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    roles: ['admin'],
    items: [
      { label: 'Overview', path: '/admin', icon: <AdminPanelSettingsOutlinedIcon />, exact: true },
      { label: 'Users', path: '/admin/users', icon: <PeopleOutlineIcon /> },
      { label: 'Resources', path: '/admin/resources', icon: <Inventory2OutlinedIcon /> },
      { label: 'Suppliers', path: '/admin/suppliers', icon: <BusinessOutlinedIcon /> },
      { label: 'Config Tables', path: '/admin/config', icon: <TuneIcon /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <HistoryIcon /> },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [{ label: 'Help', path: '/help', icon: <HelpOutlineIcon /> }],
  },
];

/** Sections the given role may see. */
export function getVisibleSections(role: Role | null): NavSection[] {
  return navSections.filter((s) => !s.roles || (role !== null && s.roles.includes(role)));
}

/** An item is active on its own path and on nested paths (except `exact` items). */
export function isNavActive(item: Pick<NavItem, 'path' | 'exact'>, pathname: string): boolean {
  if (pathname === item.path) return true;
  if (item.exact) return false;
  return pathname.startsWith(item.path + '/');
}

/** Static breadcrumb labels by path, derived from the nav model. */
export const routeLabels: Record<string, string> = Object.fromEntries(
  navSections.flatMap((s) => s.items.map((i) => [i.path, i.label])),
);
