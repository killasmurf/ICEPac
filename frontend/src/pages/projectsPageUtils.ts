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
