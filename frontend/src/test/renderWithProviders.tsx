import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial history entries for the MemoryRouter. Defaults to ['/']. */
  route?: string | string[];
}

// Phase 3 adds QueryClientProvider and ToastProvider here.
export function renderWithProviders(ui: React.ReactElement, { route = '/', ...options }: ProviderOptions = {}) {
  const entries = Array.isArray(route) ? route : [route];
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
    </ThemeProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
