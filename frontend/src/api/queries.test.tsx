import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { helpTopicQuery, projectQuery } from './queries';

const { getProject, getTopic } = vi.hoisted(() => ({
  getProject: vi.fn().mockResolvedValue({ id: 7, project_name: 'Alpha' }),
  getTopic: vi.fn().mockResolvedValue({ id: 2, title: 'Getting started' }),
}));
vi.mock('./projects', () => ({ getProject }));
vi.mock('./help', () => ({ getTopic }));

const wrapper = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('shared entity queries', () => {
  it('a page query and a select-ing lookup share one fetch and one cache entry', async () => {
    const client = new QueryClient();
    const { result } = renderHook(
      () => ({
        page: useQuery(projectQuery(7)),
        name: useQuery({ ...projectQuery(7), select: (p) => p.project_name }),
        title: useQuery({ ...helpTopicQuery(2), select: (t) => t.title }),
      }),
      { wrapper: wrapper(client) },
    );
    await waitFor(() => expect(result.current.name.data).toBe('Alpha'));
    expect(result.current.page.data).toEqual({ id: 7, project_name: 'Alpha' });
    expect(getProject).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.title.data).toBe('Getting started'));
    expect(client.getQueryData(['projects', 7])).toEqual({ id: 7, project_name: 'Alpha' });
  });
});
