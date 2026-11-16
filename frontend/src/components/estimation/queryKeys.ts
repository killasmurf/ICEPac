import type { QueryClient } from '@tanstack/react-query';

export const estimationKey = (projectId: number) => ['projects', projectId, 'estimation'] as const;
export const wbsTreeKey = (projectId: number) => ['projects', projectId, 'wbs-tree'] as const;
export const wbsDetailsKey = (projectId: number, wbsId: number | undefined) =>
  ['projects', projectId, 'wbs', wbsId, 'details'] as const;
export const projectRiskRegisterKey = (projectId: number) => ['projects', projectId, 'risk-register'] as const;

/** Refresh everything that shows totals or approval status for a project (and one WBS item, when given). */
export function invalidateEstimation(queryClient: QueryClient, projectId: number, wbsId?: number) {
  const pending = [
    queryClient.invalidateQueries({ queryKey: estimationKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: wbsTreeKey(projectId) }),
  ];
  if (wbsId !== undefined) pending.push(queryClient.invalidateQueries({ queryKey: wbsDetailsKey(projectId, wbsId) }));
  return Promise.all(pending);
}
