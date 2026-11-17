import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Helpers for optimistic updates (onMutate / onError rollback / onSettled invalidate).
 *
 * Usage in a mutation:
 *   onMutate: (vars) => applyOptimistic(queryClient, [optimisticTarget(key, (old, v) => ...)], vars),
 *   onError:  (_e, _v, snapshot) => rollbackOptimistic(queryClient, snapshot),
 *   onSettled: () => invalidate...
 *
 * Do not toast in `onError`: the global mutation cache already raises the error toast
 * (unless the mutation has `meta.silent`), so a second one would show twice.
 */

export interface OptimisticTarget<TVars> {
  queryKey: QueryKey;
  apply: (old: unknown, vars: TVars) => unknown;
}

export type OptimisticSnapshot = Array<[QueryKey, unknown]>;

/** Build a target for every cached query matching `queryKey` (prefix match). `apply` receives the cached data. */
export function optimisticTarget<TData, TVars>(
  queryKey: QueryKey,
  apply: (old: TData, vars: TVars) => TData,
): OptimisticTarget<TVars> {
  return { queryKey, apply: (old, vars) => apply(old as TData, vars) };
}

/** Cancel in-flight fetches (so they cannot overwrite the optimistic value), snapshot, then write. */
export async function applyOptimistic<TVars>(
  queryClient: QueryClient,
  targets: OptimisticTarget<TVars>[],
  vars: TVars,
): Promise<OptimisticSnapshot> {
  await Promise.all(targets.map((t) => queryClient.cancelQueries({ queryKey: t.queryKey })));
  const snapshot: OptimisticSnapshot = [];
  for (const target of targets) {
    for (const [key, data] of queryClient.getQueriesData({ queryKey: target.queryKey })) {
      if (data === undefined) continue;
      snapshot.push([key, data]);
      queryClient.setQueryData(key, target.apply(data, vars));
    }
  }
  return snapshot;
}

/** Restore every cache entry captured by `applyOptimistic`. */
export function rollbackOptimistic(queryClient: QueryClient, snapshot: OptimisticSnapshot | undefined): void {
  for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
}
