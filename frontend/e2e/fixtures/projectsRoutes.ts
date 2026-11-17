import { loadFixture } from './load';

interface ProjectRow {
  id: number;
  project_name: string;
}
interface Listing {
  items: ProjectRow[];
  total: number;
}

/** Routes for the Projects list and the ProjectUpload component. Pass as the second argument of mockApi. */
export function projectsRoutes(options: { many?: boolean } = {}) {
  let polls = 0;
  return {
    'GET /projects': (url: URL) => {
      const data = loadFixture<Listing>(options.many ? 'projects-many' : 'projects');
      const skip = Number(url.searchParams.get('skip') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 100);
      const search = (url.searchParams.get('search') ?? '').toLowerCase();
      const matches = data.items.filter((p) => p.project_name.toLowerCase().includes(search));
      return { items: matches.slice(skip, skip + limit), total: matches.length, skip, limit };
    },
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
