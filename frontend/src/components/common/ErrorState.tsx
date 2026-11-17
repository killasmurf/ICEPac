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
  /** Heading element. Defaults to `h1` (a whole-page error); use `h2`/`h3` for a panel inside a page. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  /** Smaller padding, icon and title, for a panel inside a page. */
  compact?: boolean;
}

/** Centered message for errors, not-found and not-authorised screens. */
const ErrorState: React.FC<ErrorStateProps> = ({ title, description, action, icon, headingLevel = 'h1', compact = false }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 1.5,
      py: compact ? 4 : { xs: 6, md: 10 },
      px: 2,
    }}
  >
    <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: compact ? 40 : 56 } }} aria-hidden="true">
      {icon ?? <ErrorOutlineIcon />}
    </Box>
    <Typography variant={compact ? 'h6' : 'h4'} component={headingLevel}>
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
