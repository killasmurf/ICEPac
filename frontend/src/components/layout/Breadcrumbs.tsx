import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { routeLabels } from './navConfig';
import { useProjectName, useTopicTitle } from './useLookups';

export interface Crumb {
  label: string;
  /** Absent on the last crumb. */
  to?: string;
}

interface Names {
  projectName?: string;
  topicTitle?: string;
}

/** Build the trail for a pathname. Pure so it can be unit-tested. */
export function buildCrumbs(pathname: string, { projectName, topicTitle }: Names = {}): Crumb[] {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0) return [{ label: routeLabels['/'] }];

  if (parts[0] === 'admin') {
    if (parts.length === 1) return [{ label: 'Administration' }];
    const label = routeLabels[`/admin/${parts[1]}`];
    if (parts.length === 2 && label) return [{ label: 'Administration', to: '/admin' }, { label }];
  }

  if (parts[0] === 'projects' && parts.length === 2) {
    return [{ label: 'Projects', to: '/projects' }, { label: projectName ?? `Project ${parts[1]}` }];
  }

  if (parts[0] === 'help' && parts.length === 2) {
    return [{ label: 'Help', to: '/help' }, { label: topicTitle ?? `Topic ${parts[1]}` }];
  }

  const label = routeLabels[path];
  return [{ label: label ?? 'Page not found' }];
}

function numericId(value: string | undefined): number | undefined {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

const Breadcrumbs: React.FC = () => {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[0] === 'projects' && parts.length === 2 ? numericId(parts[1]) : undefined;
  const topicId = parts[0] === 'help' && parts.length === 2 ? numericId(parts[1]) : undefined;
  const projectName = useProjectName(projectId);
  const topicTitle = useTopicTitle(topicId);

  const crumbs = buildCrumbs(pathname, { projectName, topicTitle });

  return (
    <MuiBreadcrumbs
      // A second <nav> would break the one-landmark rule for the shell, so this is a labelled group.
      component="div"
      role="group"
      aria-label="Breadcrumb"
      sx={{
        minWidth: 0,
        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
        '& .MuiBreadcrumbs-li': { minWidth: 0 },
        // On phones only the current page is shown.
        '& .MuiBreadcrumbs-li:not(:last-of-type), & .MuiBreadcrumbs-separator': { display: { xs: 'none', sm: 'flex' } },
      }}
    >
      {crumbs.map((crumb, i) =>
        i < crumbs.length - 1 && crumb.to ? (
          <Link
            key={crumb.label}
            component={RouterLink}
            to={crumb.to}
            underline="hover"
            color="text.secondary"
            variant="body2"
            noWrap
          >
            {crumb.label}
          </Link>
        ) : (
          <Typography
            key={crumb.label}
            variant="body2"
            noWrap
            aria-current="page"
            sx={{ fontWeight: 600, color: 'text.primary' }}
          >
            {crumb.label}
          </Typography>
        ),
      )}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs;
