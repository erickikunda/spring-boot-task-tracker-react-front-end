// Enums mirror the Java enums exactly — string union is the idiomatic TS equivalent.
export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

// Java UUID → string, Instant → string (ISO-8601), LocalDate → string (YYYY-MM-DD)
export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: UserResponse;
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  reporter: UserResponse;
  assignee: UserResponse | null;
  createdAt: string;
}

export interface CommentResponse {
  id: string;
  body: string;
  author: UserResponse;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
