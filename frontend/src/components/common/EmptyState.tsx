import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface EmptyStateProps {
  /** An icon element, e.g. `<InboxOutlined />`. Rendered at 48px in `text.secondary`. */
  icon?: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  /** Optional call-to-action, typically a Button. */
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1,
        px: 3,
        py: 6,
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {icon && (
        <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 48 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}

export default EmptyState;
