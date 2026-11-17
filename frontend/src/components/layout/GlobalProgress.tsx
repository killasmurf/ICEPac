import React from 'react';
import { LinearProgress } from '@mui/material';
import { useIsFetching } from '@tanstack/react-query';

/**
 * 2px progress bar pinned to the bottom edge of the header while any foreground query is fetching.
 * Queries marked `meta: { background: true }` (polling, health checks) are ignored so it does not flicker.
 */
export const GlobalProgress: React.FC = () => {
  const fetching = useIsFetching({ predicate: (query) => !query.meta?.background });
  if (fetching === 0) return null;
  return (
    <LinearProgress
      aria-label="Loading data"
      sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, bgcolor: 'transparent' }}
    />
  );
};

export default GlobalProgress;
