import client from './client';
import type { PageResponse, Role, UserResponse } from './types';

export async function listUsers(page = 0, size = 100): Promise<PageResponse<UserResponse>> {
  const { data } = await client.get<PageResponse<UserResponse>>('/api/v1/users', {
    params: { page, size },
  });
  return data;
}

export async function createUser(
  email: string,
  displayName: string,
  password: string,
  role: Role,
): Promise<UserResponse> {
  const { data } = await client.post<UserResponse>('/api/v1/users', {
    email,
    displayName,
    password,
    role,
  });
  return data;
}

export async function updateUserRole(id: string, role: Role): Promise<UserResponse> {
  const { data } = await client.patch<UserResponse>(`/api/v1/users/${id}/role`, { role });
  return data;
}
