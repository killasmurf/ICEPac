import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthContext';
import { ToastProvider } from '../components/feedback/ToastProvider';
import { queryClient } from './queryClient';

/**
 * Provider composition for the whole app.
 *
 * Order matters:
 *   ThemeProvider
 *     -> QueryClientProvider -> ToastProvider (above the router)
 *   BrowserRouter
 *     -> AuthProvider (needs the router to navigate on logout; Phase 3logout clears the query cache)
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <InitColorSchemeScript attribute="class" />
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>{children}</AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </>
);

export default AppProviders;
