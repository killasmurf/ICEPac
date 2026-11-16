import { useQuery } from '@tanstack/react-query';
import { getProject, getProjects, type Project } from '../../api/projects';
import { getTopic } from '../../api/help';

/*
 * Small lookup hooks for the shell (breadcrumb names, command-palette projects).
 * They read through the shared query cache using the plan's key convention.
 * Failures are silent (meta.silent): the shell falls back to a generic label.
 */

const isId = (id: number | undefined): id is number => id !== undefined && Number.isFinite(id);

/** Kept for existing tests. The cache now lives in the QueryClient, which tests create fresh. */
export function resetLookupCache(): void {
  /* no module-level state any more */
}

/** Name of project `id`; undefined while unknown. */
export function useProjectName(id: number | undefined): string | undefined {
  const { data } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => (await getProject(id as number)).project_name,
    enabled: isId(id),
    meta: { silent: true },
  });
  return isId(id) ? data : undefined;
}

/** Title of help topic `id`; undefined while unknown. */
export function useTopicTitle(id: number | undefined): string | undefined {
  const { data } = useQuery({
    queryKey: ['help', 'topics', id],
    queryFn: async () => (await getTopic(id as number)).title,
    enabled: isId(id),
    meta: { silent: true },
  });
  return isId(id) ? data : undefined;
}

/** First 50 projects for the command palette. Fetches only while `enabled`. */
export function useProjectOptions(enabled: boolean): { projects: Project[]; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['projects', 'list', { page: 0, pageSize: 50, search: '' }],
    queryFn: async () => (await getProjects(0, 50)).items,
    enabled,
    meta: { silent: true },
  });
  return { projects: data ?? [], loading: enabled && isLoading };
}
