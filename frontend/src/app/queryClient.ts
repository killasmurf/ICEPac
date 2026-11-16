import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { emitToast, errorMessage } from '../components/feedback/toastBus';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { silent?: boolean };
    mutationMeta: { silent?: boolean };
  }
}

/**
 * Build a query client. `onError` is called for every failed query/mutation
 * unless its `meta.silent` is true; by default it raises an error toast via the toast bus.
 */
export function createQueryClient(onError: (error: unknown) => void = (e) => emitToast('error', errorMessage(e))) {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.silent) return;
        onError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (mutation.meta?.silent) return;
        onError(error);
      },
    }),
  });
}

export const queryClient = createQueryClient();
