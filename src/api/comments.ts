import client from './client';
import type { CommentResponse } from './types';

export async function listComments(taskId: string): Promise<CommentResponse[]> {
  const { data } = await client.get<CommentResponse[]>(`/api/v1/tasks/${taskId}/comments`);
  return data;
}

export async function createComment(taskId: string, body: string): Promise<CommentResponse> {
  const { data } = await client.post<CommentResponse>(`/api/v1/tasks/${taskId}/comments`, { body });
  return data;
}

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  await client.delete(`/api/v1/tasks/${taskId}/comments/${commentId}`);
}
