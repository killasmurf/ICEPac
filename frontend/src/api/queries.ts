import { queryOptions } from '@tanstack/react-query';
import { getProject } from './projects';
import { getTopic } from './help';

/*
 * One query per entity. The pages read the full object; the shell's breadcrumb lookups share the
 * same key and fetch and use `select` to pick the name or title, so each entity is fetched once.
 */

export const projectQuery = (id: number) =>
  queryOptions({
    queryKey: ['projects', id] as const,
    queryFn: () => getProject(id),
  });

export const helpTopicQuery = (id: number) =>
  queryOptions({
    queryKey: ['help', 'topics', id] as const,
    queryFn: () => getTopic(id),
  });
