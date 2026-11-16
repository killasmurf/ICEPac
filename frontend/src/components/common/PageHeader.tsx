import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Right-aligned on desktop; wraps under the title on mobile. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}
    >
      <Box sx={{ minWidth: 0, flex: '1 1 280px' }}>
        <Typography variant="h3" component="h1">
          {title}
        </Typography>
        {subtitle != null && (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box data-testid="page-header-actions" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}

export default PageHeader;
