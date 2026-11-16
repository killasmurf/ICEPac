import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from './queryClient';
import { emitToast, registerToastHandler, errorMessage } from '../components/feedback/toastBus';

describe('createQueryClient', () => {
  it('applies the default options', () => {
    const d = createQueryClient(vi.fn()).getDefaultOptions().queries!;
    expect(d.staleTime).toBe(30_000);
    expect(d.retry).toBe(1);
    expect(d.refetchOnWindowFocus).toBe(false);
  });

  it('reports a failed query', async () => {
    const onError = vi.fn();
    const qc = createQueryClient(onError);
    const err = new Error('boom');
    await qc.fetchQuery({ queryKey: ['a'], queryFn: () => Promise.reject(err), retry: false }).catch(() => {});
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('does not report a failed query with meta.silent', async () => {
    const onError = vi.fn();
    const qc = createQueryClient(onError);
    await qc
      .fetchQuery({ queryKey: ['b'], queryFn: () => Promise.reject(new Error('x')), retry: false, meta: { silent: true } })
      .catch(() => {});
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a failed mutation unless silent', async () => {
    const onError = vi.fn();
    const qc = createQueryClient(onError);
    const run = (meta?: { silent?: boolean }) =>
      qc.getMutationCache().build(qc, { mutationFn: () => Promise.reject(new Error('m')), meta }).execute(undefined).catch(() => {});
    await run();
    expect(onError).toHaveBeenCalledTimes(1);
    await run({ silent: true });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('default handler emits an error toast on the bus with the API detail', async () => {
    const handler = vi.fn();
    const off = registerToastHandler(handler);
    const qc = createQueryClient();
    const apiError = Object.assign(new Error('Request failed'), { response: { data: { detail: 'Project not found' } } });
    await qc.fetchQuery({ queryKey: ['c'], queryFn: () => Promise.reject(apiError), retry: false }).catch(() => {});
    expect(handler).toHaveBeenCalledWith('error', 'Project not found');
    off();
  });
});

describe('toastBus', () => {
  it('is a no-op without a handler and stops delivering after unsubscribe', () => {
    expect(() => emitToast('info', 'x')).not.toThrow();
    const handler = vi.fn();
    const off = registerToastHandler(handler);
    emitToast('success', 'hi');
    off();
    emitToast('success', 'again');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('errorMessage falls back sensibly', () => {
    expect(errorMessage(new Error('plain'))).toBe('plain');
    expect(errorMessage(null)).toMatch(/something went wrong/i);
  });
});
