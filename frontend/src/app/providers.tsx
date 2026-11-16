import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { AuthProvider } from '../auth/AuthContext';

/**
 * Provider composition for the whole app.
 *
 * Order matters:
 *   ThemeProvider
 *     -> (Phase 3: QueryClientProvider, then ToastProvider go HERE, above the router)
 *   BrowserRouter
 *     -> AuthProvider (needs the router to navigate on logout; Phase 3 logout clears the query cache)
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <InitColorSchemeScript attribute="class" />
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />
      {/* Phase 3: <QueryClientProvider> and <ToastProvider> wrap BrowserRouter here. */}
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </>
);

export default AppProviders;
