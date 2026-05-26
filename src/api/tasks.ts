import client from './client';
import type { PageResponse, Priority, TaskResponse, TaskStatus } from './types';

export async function listTasks(
  projectId: string,
  params?: { status?: TaskStatus; page?: number; size?: number },
): Promise<PageResponse<TaskResponse>> {
  const { data } = await client.get<PageResponse<TaskResponse>>(
    `/api/v1/projects/${projectId}/tasks`,
    { params },
  );
  return data;
}

export async function createTask(
  projectId: string,
  payload: { title: string; description?: string; priority: Priority; dueDate?: string },
): Promise<TaskResponse> {
  const { data } = await client.post<TaskResponse>(
    `/api/v1/projects/${projectId}/tasks`,
    payload,
  );
  return data;
}

export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
): Promise<TaskResponse> {
  const { data } = await client.patch<TaskResponse>(
    `/api/v1/projects/${projectId}/tasks/${taskId}/status`,
    { status },
  );
  return data;
}

export async function assignTask(
  projectId: string,
  taskId: string,
  assigneeId: string,
): Promise<TaskResponse> {
  const { data } = await client.put<TaskResponse>(
    `/api/v1/projects/${projectId}/tasks/${taskId}/assignee`,
    { assigneeId },
  );
  return data;
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await client.delete(`/api/v1/projects/${projectId}/tasks/${taskId}`);
}
