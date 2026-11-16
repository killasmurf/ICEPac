import React from 'react';
import { Box, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export interface ErrorStateProps {
  title: string;
  description?: React.ReactNode;
  /** Usually a Button. */
  action?: React.ReactNode;
  /** Defaults to an error icon. */
  icon?: React.ReactNode;
}

/** Centered message for errors, not-found and not-authorised screens. */
const ErrorState: React.FC<ErrorStateProps> = ({ title, description, action, icon }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 1.5,
      py: { xs: 6, md: 10 },
      px: 2,
    }}
  >
    <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 56 } }} aria-hidden="true">
      {icon ?? <ErrorOutlineIcon />}
    </Box>
    <Typography variant="h4" component="h1">
      {title}
    </Typography>
    {description && (
      <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
  </Box>
);

export default ErrorState;
