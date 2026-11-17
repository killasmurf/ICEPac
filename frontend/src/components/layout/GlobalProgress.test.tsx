import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GlobalProgress from './GlobalProgress';

function renderBar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <GlobalProgress />
    </QueryClientProvider>,
  );
  return queryClient;
}

const never = () => new Promise<never>(() => {});

describe('GlobalProgress', () => {
  it('renders nothing when idle', () => {
    renderBar();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows while a foreground query is fetching and hides when it settles', async () => {
    const queryClient = renderBar();
    let resolve: (v: number) => void = () => {};
    void queryClient.fetchQuery({ queryKey: ['a'], queryFn: () => new Promise<number>((r) => (resolve = r)) });
    expect(await screen.findByRole('progressbar', { name: 'Loading data' })).toBeInTheDocument();
    resolve(1);
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });

  it('ignores background queries (polling) so the bar does not flicker', async () => {
    const queryClient = renderBar();
    void queryClient.fetchQuery({ queryKey: ['poll'], queryFn: never, meta: { background: true } });
    await new Promise((r) => setTimeout(r, 50));
    expect(queryClient.isFetching()).toBe(1);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
