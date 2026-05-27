import client from './client';
import type { BatchUpdateResult, ProjectResponse, ProjectStatus, UserResponse } from './types';

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

export async function getProjectMembers(id: string): Promise<UserResponse[]> {
  const { data } = await client.get<UserResponse[]>(`/api/v1/projects/${id}/members`);
  return data;
}

export async function addMember(projectId: string, userId: string): Promise<void> {
  await client.post(`/api/v1/projects/${projectId}/members/${userId}`);
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  await client.delete(`/api/v1/projects/${projectId}/members/${userId}`);
}

export async function batchUpdateStatus(
  projectIds: string[],
  newStatus: ProjectStatus,
  batchSize = 500,
): Promise<BatchUpdateResult> {
  const { data } = await client.patch<BatchUpdateResult>(
    `/api/v1/projects/batch-status?batchSize=${batchSize}`,
    { projectIds, newStatus },
  );
  return data;
}
