import client from './client';

export interface HelpDescription {
  id: number;
  topic_id: number;
  section_number: number;
  detailed_text: string;
  created_at: string;
}

export interface HelpCategory {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpTopic {
  id: number;
  category_id: number;
  title: string;
  content: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  descriptions: HelpDescription[];
}

export interface HelpTopicListResponse {
  items: HelpTopic[];
  total: number;
  skip: number;
  limit: number;
}

export async function getTopics(skip = 0, limit = 100): Promise<HelpTopicListResponse> {
  const response = await client.get('/help/topics', { params: { skip, limit } });
  return response.data;
}

export async function getTopic(id: number): Promise<HelpTopic> {
  const response = await client.get(`/help/topics/${id}`);
  return response.data;
}

export async function searchTopics(query: string, skip = 0, limit = 100): Promise<HelpTopicListResponse> {
  const response = await client.get('/help/search', { params: { q: query, skip, limit } });
  return response.data;
}

export async function getCategories(): Promise<HelpCategory[]> {
  const response = await client.get('/help/categories');
  return response.data;
}

export async function getTopicsByCategory(categoryId: number, skip = 0, limit = 100): Promise<HelpTopicListResponse> {
  const response = await client.get(`/help/categories/${categoryId}/topics`, { params: { skip, limit } });
  return response.data;
}
