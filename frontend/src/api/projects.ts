import client from './client';

export interface Project {
  id: number;
  project_name: string;
  project_manager: string | null;
  description: string | null;
  archived: boolean;
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
