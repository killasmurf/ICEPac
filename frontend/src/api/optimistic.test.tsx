import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, useMutation } from '@tanstack/react-query';
import { createQueryClient } from '../app/queryClient';
import { emitToast, errorMessage, registerToastHandler } from '../components/feedback/toastBus';
import { applyOptimistic, optimisticTarget, rollbackOptimistic } from './optimistic';

interface Row {
  id: number;
  status: string;
}

const KEY = ['rows'] as const;
const target = optimisticTarget<Row[], { id: number; status: string }>(KEY, (rows, v) =>
  rows.map((r) => (r.id === v.id ? { ...r, status: v.status } : r)),
);

function setup(mutationFn: (v: { id: number; status: string }) => Promise<void>) {
  const toasts: Array<[string, string]> = [];
  const unregister = registerToastHandler((sev, msg) => toasts.push([sev, msg]));
  // Real global error handler: raises an error toast through the toast bus.
  const queryClient = createQueryClient((e) => emitToast('error', errorMessage(e)));
  queryClient.setQueryData<Row[]>(KEY, [
    { id: 1, status: 'open' },
    { id: 2, status: 'open' },
  ]);
  const invalidate = vi.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useMutation({
        mutationFn,
        onMutate: (v) => applyOptimistic(queryClient, [target], v),
        onError: (_e, _v, snapshot) => rollbackOptimistic(queryClient, snapshot),
        onSettled: invalidate,
      }),
    { wrapper },
  );
  return { queryClient, toasts, unregister, invalidate, hook };
}

describe('optimistic updates', () => {
  it('writes the new value before the request resolves', async () => {
    let resolve: () => void = () => {};
    const { queryClient, hook, unregister } = setup(() => new Promise<void>((r) => (resolve = r)));
    act(() => hook.result.current.mutate({ id: 1, status: 'closed' }));
    await waitFor(() => expect(queryClient.getQueryData<Row[]>(KEY)?.[0].status).toBe('closed'));
    expect(hook.result.current.isPending).toBe(true);
    await act(async () => resolve());
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<Row[]>(KEY)?.[0].status).toBe('closed');
    unregister();
  });

  it('restores the previous cache value and raises exactly one error toast when the request fails', async () => {
    const { queryClient, hook, toasts, invalidate, unregister } = setup(() => Promise.reject(new Error('Server said no')));
    const before = queryClient.getQueryData<Row[]>(KEY);
    act(() => hook.result.current.mutate({ id: 1, status: 'closed' }));
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(queryClient.getQueryData<Row[]>(KEY)).toEqual(before);
    expect(toasts).toEqual([['error', 'Server said no']]);
    expect(invalidate).toHaveBeenCalledTimes(1);
    unregister();
  });

  it('does not touch queries that are not cached', async () => {
    const { queryClient, unregister } = setup(() => Promise.resolve());
    const snapshot = await applyOptimistic(queryClient, [optimisticTarget<Row[], number>(['missing'], (r) => r)], 1);
    expect(snapshot).toEqual([]);
    expect(queryClient.getQueryData(['missing'])).toBeUndefined();
    unregister();
  });
});
