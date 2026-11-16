import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from '../theme';
import { ToastProvider } from '../components/feedback/ToastProvider';

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial history entries for the MemoryRouter. Defaults to ['/']. */
  route?: string | string[];
}

export function renderWithProviders(ui: React.ReactElement, { route = '/', ...options }: ProviderOptions = {}) {
  const entries = Array.isArray(route) ? route : [route];
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
