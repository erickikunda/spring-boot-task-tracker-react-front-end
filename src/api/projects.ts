import client from './client';
import type { ProjectResponse } from './types';

export async function listProjects(): Promise<ProjectResponse[]> {
  const { data } = await client.get<ProjectResponse[]>('/api/v1/projects');
  return data;
}

export async function getProject(id: string): Promise<ProjectResponse> {
  const { data } = await client.get<ProjectResponse>(`/api/v1/projects/${id}`);
  return data;
}

export async function createProject(name: string, description: string): Promise<ProjectResponse> {
  const { data } = await client.post<ProjectResponse>('/api/v1/projects', { name, description });
  return data;
}

export async function archiveProject(id: string): Promise<ProjectResponse> {
  const { data } = await client.post<ProjectResponse>(`/api/v1/projects/${id}/archive`);
  return data;
}
