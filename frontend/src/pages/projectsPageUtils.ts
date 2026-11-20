import type { ProjectSortField, ProjectSortOrder } from '../api/projects';

export type ProjectsView = 'cards' | 'table';

export const VIEW_STORAGE_KEY = 'icepac.projectsView';
export const CARD_PAGE_SIZE = 12;

export function readStoredView(): ProjectsView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

export function storeView(view: ProjectsView): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* storage unavailable: the choice just is not remembered */
  }
}

export interface ProjectFormValues {
  project_name: string;
  project_manager: string;
  description: string;
}

export const EMPTY_FORM: ProjectFormValues = { project_name: '', project_manager: '', description: '' };

/** Validation message for the project name, or null when valid. */
export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Project name is required';
  if (trimmed.length > 255) return 'Project name must be 255 characters or fewer';
  return null;
}

/** Body for POST /projects: optional fields are omitted when blank. */
export function toCreateBody(values: ProjectFormValues) {
  return {
    project_name: values.project_name.trim(),
    ...(values.project_manager.trim() && { project_manager: values.project_manager.trim() }),
    ...(values.description.trim() && { description: values.description.trim() }),
  };
}

/** Body for PUT /projects/{id}: blank optional fields clear the value. */
export function toUpdateBody(values: ProjectFormValues) {
  return {
    project_name: values.project_name.trim(),
    project_manager: values.project_manager.trim() || null,
    description: values.description.trim() || null,
  };
}

/** skip value for the list endpoint. */
export const toSkip = (page: number, pageSize: number) => Math.max(0, page) * pageSize;

// ------------------------------------------------------------------
// URL state: ?archived=1&status=active&sort=name&order=asc
// ------------------------------------------------------------------

export const PROJECT_STATUSES = ['draft', 'importing', 'imported', 'import_failed', 'active'] as const;

export const SORT_FIELDS: readonly ProjectSortField[] = ['name', 'created_at', 'updated_at', 'status', 'manager'];

const TEXT_FIELDS: readonly ProjectSortField[] = ['name', 'status', 'manager'];

/** The server's own default direction for a field: text ascending, dates descending. */
export const defaultOrder = (field: ProjectSortField): ProjectSortOrder => (TEXT_FIELDS.includes(field) ? 'asc' : 'desc');

export interface ProjectsQueryState {
  archived: boolean;
  status: string | undefined;
  sort: ProjectSortField | undefined;
  order: ProjectSortOrder | undefined;
}

export function readQueryState(params: URLSearchParams): ProjectsQueryState {
  const status = params.get('status');
  const sort = params.get('sort') as ProjectSortField | null;
  const order = params.get('order');
  const validSort = sort && SORT_FIELDS.includes(sort) ? sort : undefined;
  return {
    archived: params.get('archived') === '1',
    status: status && (PROJECT_STATUSES as readonly string[]).includes(status) ? status : undefined,
    sort: validSort,
    order: validSort && (order === 'asc' || order === 'desc') ? order : undefined,
  };
}

/** Copy of `params` with the list state written (undefined values removed). `new` and other keys are kept. */
export function writeQueryState(params: URLSearchParams, state: ProjectsQueryState): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ['archived', 'status', 'sort', 'order']) next.delete(key);
  if (state.archived) next.set('archived', '1');
  if (state.status) next.set('status', state.status);
  if (state.sort) {
    next.set('sort', state.sort);
    if (state.order) next.set('order', state.order);
  }
  return next;
}

/** DataGrid column field to API sort field. */
export const COLUMN_TO_SORT: Record<string, ProjectSortField> = {
  project_name: 'name',
  project_manager: 'manager',
  status: 'status',
  updated_at: 'updated_at',
  created_at: 'created_at',
};

export const SORT_TO_COLUMN: Record<ProjectSortField, string> = {
  name: 'project_name',
  manager: 'project_manager',
  status: 'status',
  updated_at: 'updated_at',
  created_at: 'created_at',
};

const SORT_LABELS: Record<ProjectSortField, [string, string]> = {
  updated_at: ['Recently updated', 'Least recently updated'],
  created_at: ['Newest first', 'Oldest first'],
  name: ['Name A to Z', 'Name Z to A'],
  manager: ['Manager A to Z', 'Manager Z to A'],
  status: ['Status A to Z', 'Status Z to A'],
};

export interface SortOption {
  value: string;
  label: string;
  sort: ProjectSortField;
  order: ProjectSortOrder;
}

/** Options for the card view "Sort by" select. Value is `field:order`. */
export const SORT_OPTIONS: SortOption[] = SORT_FIELDS.flatMap((sort) => {
  const first = defaultOrder(sort);
  const second: ProjectSortOrder = first === 'asc' ? 'desc' : 'asc';
  return [first, second].map((order) => ({
    value: `${sort}:${order}`,
    label: SORT_LABELS[sort][order === first ? 0 : 1],
    sort,
    order,
  }));
});

/** Current select value: the server default (updated_at desc) when nothing is in the URL. */
export function sortSelectValue(state: Pick<ProjectsQueryState, 'sort' | 'order'>): string {
  const sort = state.sort ?? 'updated_at';
  return `${sort}:${state.order ?? defaultOrder(sort)}`;
}
