import { loadFixture } from './load';

interface ProjectRow {
  id: number;
  project_name: string;
  project_manager: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
}
interface Listing {
  items: ProjectRow[];
  total: number;
}

const SORT_KEYS: Record<string, keyof ProjectRow> = {
  name: 'project_name',
  manager: 'project_manager',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at',
};
const TEXT_SORTS = ['name', 'manager', 'status'];

/** Routes for the Projects list and the ProjectUpload component. Pass as the second argument of mockApi. */
export function projectsRoutes(options: { many?: boolean } = {}) {
  let polls = 0;
  const restored = new Set<number>();
  const restore = (id: number) => () => {
    restored.add(id);
    return { ...loadFixture<Listing>('projects-archived').items.find((p) => p.id === id), archived: false };
  };
  return {
    'GET /projects': (url: URL) => {
      const archived = url.searchParams.get('archived') === 'true';
      const source = archived
        ? loadFixture<Listing>('projects-archived').items.filter((p) => !restored.has(p.id))
        : loadFixture<Listing>(options.many ? 'projects-many' : 'projects').items;
      const skip = Number(url.searchParams.get('skip') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 100);
      const search = (url.searchParams.get('search') ?? '').toLowerCase();
      const status = url.searchParams.get('status');
      const sort = url.searchParams.get('sort');
      const order = url.searchParams.get('order') ?? (TEXT_SORTS.includes(sort ?? '') ? 'asc' : 'desc');
      const matches = source.filter((p) => p.project_name.toLowerCase().includes(search) && (!status || p.status === status));
      if (sort) {
        const key = SORT_KEYS[sort];
        const dir = order === 'desc' ? -1 : 1;
        matches.sort((x, y) => dir * String(x[key] ?? '').localeCompare(String(y[key] ?? '')) || dir * (x.id - y.id));
      }
      return { items: matches.slice(skip, skip + limit), total: matches.length, skip, limit };
    },
    'POST /projects/3/restore': restore(3),
    'POST /projects/4/restore': restore(4),
    'POST /projects': () => ({ ...loadFixture<Listing>('projects').items[0], id: 99, project_name: 'Created' }),
    'PUT /projects/1': () => loadFixture<Listing>('projects').items[0],
    'DELETE /projects/1': () => null,
    'GET /projects/1/imports': () => loadFixture('projects-imports'),
    'POST /projects/1/import': () => ({ job_id: 7, status: 'pending', message: "Import started for 'plan.mpp'" }),
    'GET /projects/1/imports/7': () => {
      polls += 1;
      const base = {
        id: 7, project_id: 1, user_id: 1, filename: 'plan.mpp', s3_key: null, file_size: 2048, celery_task_id: null,
        error_message: null, started_at: '2026-03-03T01:00:00Z', completed_at: null,
        created_at: '2026-03-03T01:00:00Z', updated_at: '2026-03-03T01:00:00Z',
      };
      return polls < 2
        ? { ...base, status: 'parsing', progress: 40, task_count: 0, resource_count: 0, assignment_count: 0 }
        : { ...base, status: 'completed', progress: 100, task_count: 12, resource_count: 3, assignment_count: 20 };
    },
  };
}
