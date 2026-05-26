import client from './client';
import type { AuthResponse } from './types';

export async function register(
  email: string,
  displayName: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/api/v1/auth/register', {
    email,
    displayName,
    password,
  });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/api/v1/auth/login', {
    email,
    password,
  });
  return data;
}
