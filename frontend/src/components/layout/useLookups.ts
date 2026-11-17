import { useQuery } from '@tanstack/react-query';
import { getProjects, type Project } from '../../api/projects';
import { helpTopicQuery, projectQuery } from '../../api/queries';

/*
 * Small lookup hooks for the shell (breadcrumb names, command-palette projects).
 * They share one query per entity with the pages (see api/queries.ts) and `select` the name or title.
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
    ...projectQuery(id as number),
    select: (project) => project.project_name,
    enabled: isId(id),
    meta: { silent: true },
  });
  return isId(id) ? data : undefined;
}

/** Title of help topic `id`; undefined while unknown. */
export function useTopicTitle(id: number | undefined): string | undefined {
  const { data } = useQuery({
    ...helpTopicQuery(id as number),
    select: (topic) => topic.title,
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
