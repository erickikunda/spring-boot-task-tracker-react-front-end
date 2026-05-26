import client from './client';
import type { PageResponse, UserResponse } from './types';

export async function listUsers(page = 0, size = 100): Promise<PageResponse<UserResponse>> {
  const { data } = await client.get<PageResponse<UserResponse>>('/api/v1/users', {
    params: { page, size },
  });
  return data;
}
