import React from 'react';
import { Link } from '@mui/material';

/** Id of the `<main>` element the skip link moves focus to. */
export const MAIN_ID = 'main-content';

/**
 * "Skip to content": the first tab stop in the app shell. Hidden off-screen until focused,
 * then shown as a gold button (navy text, 7.5:1) in both colour modes. Moves focus to `<main>`.
 */
export const SkipLink: React.FC = () => (
  <Link
    href={`#${MAIN_ID}`}
    onClick={(e) => {
      e.preventDefault();
      document.getElementById(MAIN_ID)?.focus();
    }}
    underline="none"
    sx={(theme) => ({
      position: 'fixed',
      top: 8,
      left: 8,
      zIndex: theme.zIndex.tooltip + 1,
      px: 2,
      py: 1,
      borderRadius: 1,
      fontWeight: 600,
      bgcolor: 'secondary.main',
      color: 'secondary.contrastText',
      transform: 'translateY(-200%)',
      '&:focus-visible': { transform: 'none' },
    })}
  >
    Skip to content
  </Link>
);

export default SkipLink;
