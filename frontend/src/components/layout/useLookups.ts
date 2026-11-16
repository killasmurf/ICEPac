import { useEffect, useState } from 'react';
import { getProject, getProjects, type Project } from '../../api/projects';
import { getTopic } from '../../api/help';

/*
 * Small fetch hooks for the shell (breadcrumb names, command-palette projects).
 * They use a module-level cache with plain React state.
 * TODO(phase-3): replace the bodies with useQuery calls against the shared query cache;
 * keep the hook names and return shapes so callers do not change.
 */

const projectNames = new Map<number, string>();
const topicTitles = new Map<number, string>();
let projectList: Project[] = [];

/** Test helper: forget everything cached. */
export function resetLookupCache(): void {
  projectNames.clear();
  topicTitles.clear();
  projectList = [];
}

function useCachedName(
  id: number | undefined,
  cache: Map<number, string>,
  fetcher: (id: number) => Promise<string>,
): string | undefined {
  const [fetched, setFetched] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (id === undefined || !Number.isFinite(id)) return;
    let cancelled = false;
    fetcher(id)
      .then((name) => {
        cache.set(id, name);
        if (!cancelled) setFetched({ id, name });
      })
      .catch(() => {
        /* keep the fallback label */
      });
    return () => {
      cancelled = true;
    };
  }, [id, cache, fetcher]);

  if (id === undefined || !Number.isFinite(id)) return undefined;
  return fetched?.id === id ? fetched.name : cache.get(id);
}

const fetchProjectName = async (id: number) => (await getProject(id)).project_name;
const fetchTopicTitle = async (id: number) => (await getTopic(id)).title;

/** Name of project `id` (cached value first, then refreshed); undefined while unknown. */
export function useProjectName(id: number | undefined): string | undefined {
  return useCachedName(id, projectNames, fetchProjectName);
}

/** Title of help topic `id`; undefined while unknown. */
export function useTopicTitle(id: number | undefined): string | undefined {
  return useCachedName(id, topicTitles, fetchTopicTitle);
}

/** First 50 projects for the command palette. Fetches only while `enabled`. */
export function useProjectOptions(enabled: boolean): { projects: Project[]; loading: boolean } {
  const [state, setState] = useState<{ projects: Project[]; done: boolean }>({ projects: projectList, done: false });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getProjects(0, 50)
      .then((res) => {
        projectList = res.items;
        res.items.forEach((p) => projectNames.set(p.id, p.project_name));
        if (!cancelled) setState({ projects: res.items, done: true });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, done: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { projects: state.projects, loading: enabled && !state.done };
}
