import client from './client';

// ============================================================
// Project types
// ============================================================

export interface Project {
  id: number;
  project_name: string;
  project_manager: string | null;
  description: string | null;
  archived: boolean;
  status: string | null;
  source_file: string | null;
  source_format: string | null;
  start_date: string | null;
  finish_date: string | null;
  baseline_start: string | null;
  baseline_finish: string | null;
  task_count: number;
  resource_count: number;
  owner_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProjectCreateInput {
  project_name: string;
  project_manager?: string;
  description?: string;
}

export interface ProjectUpdateInput {
  project_name?: string;
  project_manager?: string;
  description?: string;
  archived?: boolean;
}

// ============================================================
// Import types
// ============================================================

export interface ImportJob {
  id: number;
  project_id: number;
  user_id: number;
  filename: string;
  s3_key: string | null;
  file_size: number | null;
  status: string;
  progress: number;
  celery_task_id: string | null;
  task_count: number;
  resource_count: number;
  assignment_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportJobListResponse {
  items: ImportJob[];
  total: number;
}

export interface ImportStartResponse {
  job_id: number;
  status: string;
  message: string;
}

// ============================================================
// WBS types
// ============================================================

export interface WBSItem {
  id: number;
  project_id: number;
  task_unique_id: number | null;
  wbs_code: string | null;
  wbs_title: string;
  outline_level: number;
  parent_id: number | null;
  schedule_start: string | null;
  schedule_finish: string | null;
  baseline_start: string | null;
  baseline_finish: string | null;
  late_start: string | null;
  late_finish: string | null;
  actual_start: string | null;
  actual_finish: string | null;
  duration: number | null;
  duration_units: string | null;
  percent_complete: number;
  cost: number | null;
  baseline_cost: number | null;
  is_milestone: boolean;
  is_summary: boolean;
  is_critical: boolean;
  resource_names: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WBSTreeNode extends WBSItem {
  children: WBSTreeNode[];
}

export interface WBSListResponse {
  items: WBSItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface WBSTreeResponse {
  items: WBSTreeNode[];
  total: number;
}

// ============================================================
// Project API functions
// ============================================================

export async function getProjects(skip = 0, limit = 100, search?: string): Promise<ProjectListResponse> {
  const params: Record<string, any> = { skip, limit };
  if (search) params.search = search;
  const response = await client.get('/projects', { params });
  return response.data;
}

export async function getProject(id: number): Promise<Project> {
  const response = await client.get(`/projects/${id}`);
  return response.data;
}

export async function createProject(data: ProjectCreateInput): Promise<Project> {
  const response = await client.post('/projects', data);
  return response.data;
}

export async function updateProject(id: number, data: ProjectUpdateInput): Promise<Project> {
  const response = await client.put(`/projects/${id}`, data);
  return response.data;
}

export async function deleteProject(id: number): Promise<void> {
  await client.delete(`/projects/${id}`);
}

// ============================================================
// Import API functions
// ============================================================

export async function uploadProjectFile(projectId: number, file: File): Promise<ImportStartResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`/projects/${projectId}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getImportStatus(projectId: number, jobId: number): Promise<ImportJob> {
  const response = await client.get(`/projects/${projectId}/imports/${jobId}`);
  return response.data;
}

export async function getImportHistory(projectId: number): Promise<ImportJobListResponse> {
  const response = await client.get(`/projects/${projectId}/imports`);
  return response.data;
}

// ============================================================
// WBS API functions
// ============================================================

export async function getWBSList(projectId: number, skip = 0, limit = 1000): Promise<WBSListResponse> {
  const response = await client.get(`/projects/${projectId}/wbs`, { params: { skip, limit } });
  return response.data;
}

export async function getWBSTree(projectId: number): Promise<WBSTreeResponse> {
  const response = await client.get(`/projects/${projectId}/wbs/tree`);
  return response.data;
}
