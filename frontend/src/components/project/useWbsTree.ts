import { useQuery } from '@tanstack/react-query';
import { getWBSTree } from '../../api/projects';

/** Shared WBS tree query so the page and the tree read one cache entry. */
export function useWbsTree(projectId: number, enabled = true) {
  return useQuery({
    queryKey: ['projects', projectId, 'wbs-tree'],
    queryFn: () => getWBSTree(projectId),
    enabled: enabled && Number.isFinite(projectId),
    meta: { silent: true },
  });
}
