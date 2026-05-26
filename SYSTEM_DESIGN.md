# TaskFlow — System Design

## Overview

TaskFlow is a full-stack task tracker. The backend is a stateless REST API; the frontend is a React SPA. They communicate over HTTP with JWT for authentication.

```
┌────────────────────────────────────┐        ┌──────────────────────────────────────┐
│         React SPA (Vite)           │        │      Spring Boot 4.0 REST API        │
│         localhost:5173             │        │          localhost:8080               │
│                                    │        │                                      │
│  AuthContext (token, user)         │        │  SecurityFilterChain                 │
│       │                            │        │    └─ JwtAuthenticationFilter        │
│  Axios client                      │◄──────►│    └─ CorsFilter                     │
│    request interceptor             │  JSON  │                                      │
│    response interceptor (401)      │  HTTP  │  Controllers → Services → Repos      │
│                                    │        │                                      │
│  React Router                      │        │  Spring Data JPA                     │
│    /login, /register               │        │    H2 (dev) / PostgreSQL 16 (prod)   │
│    /dashboard, /projects/:id       │        │    Flyway migrations (prod)          │
└────────────────────────────────────┘        └──────────────────────────────────────┘
```

---

## Data Model

```
User
 ├─ id (UUID)
 ├─ email (unique)
 ├─ displayName
 ├─ role: ADMIN | MANAGER | MEMBER
 └─ createdAt

Project
 ├─ id (UUID)
 ├─ name, description
 ├─ status: ACTIVE | ARCHIVED
 ├─ owner → User
 ├─ members → Set<User>   (owner is always a member)
 └─ createdAt

Task
 ├─ id (UUID)
 ├─ title, description
 ├─ status: TODO | IN_PROGRESS | IN_REVIEW | DONE | CANCELLED
 ├─ priority: LOW | MEDIUM | HIGH | CRITICAL
 ├─ dueDate (LocalDate, nullable)
 ├─ project → Project
 ├─ reporter → User
 ├─ assignee → User (nullable)
 └─ createdAt

Comment
 ├─ id (UUID)
 ├─ body
 ├─ task → Task
 ├─ author → User
 └─ createdAt
```

---

## Authentication Flow

```
Browser                          React App                       Spring Boot
  │                                 │                                │
  │── enter email+password ────────►│                                │
  │                                 │── POST /api/v1/auth/login ────►│
  │                                 │                                │── validate credentials
  │                                 │                                │── sign JWT (HS256, 1d TTL)
  │                                 │◄── { token, user } ───────────│
  │                                 │                                │
  │                                 │── localStorage.setItem(token)  │
  │                                 │── AuthContext.setToken()       │
  │                                 │                                │
  │                                 │── GET /api/v1/projects         │
  │                                 │   Authorization: Bearer <jwt> ►│
  │                                 │                                │── JwtAuthFilter extracts sub
  │                                 │                                │── loads UserDetails
  │                                 │                                │── sets SecurityContext
  │                                 │◄── 200 [projects] ────────────│
```

On 401: Axios response interceptor clears `localStorage`; `ProtectedRoute` redirects to `/login` on the next render.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Create account, returns JWT |
| POST | `/api/v1/auth/login` | — | Login, returns JWT |
| GET | `/api/v1/users` | Any | List all users (paginated) |
| GET | `/api/v1/users/:id` | Any | Get user by ID |
| GET | `/api/v1/projects` | Any | List projects for current user |
| POST | `/api/v1/projects` | Any | Create project (caller becomes owner + member) |
| GET | `/api/v1/projects/:id` | Member/Admin | Get project |
| POST | `/api/v1/projects/:id/archive` | Owner/Admin | Archive project |
| POST | `/api/v1/projects/:id/members/:uid` | Owner/Admin | Add member |
| DELETE | `/api/v1/projects/:id/members/:uid` | Owner/Admin | Remove member |
| GET | `/api/v1/projects/:id/tasks` | Member/Admin | List tasks (paginated, filterable by status) |
| POST | `/api/v1/projects/:id/tasks` | Member/Admin | Create task |
| GET | `/api/v1/projects/:id/tasks/:tid` | Member/Admin | Get task |
| PATCH | `/api/v1/projects/:id/tasks/:tid/status` | Member/Admin | Update task status |
| PUT | `/api/v1/projects/:id/tasks/:tid/assignee` | Member/Admin | Assign task |
| DELETE | `/api/v1/projects/:id/tasks/:tid/assignee` | Member/Admin | Unassign task |
| DELETE | `/api/v1/projects/:id/tasks/:tid` | Member/Admin | Delete task |
| GET | `/api/v1/tasks/:id/comments` | Any | List comments on a task |
| POST | `/api/v1/tasks/:id/comments` | Any | Add comment |
| DELETE | `/api/v1/tasks/:id/comments/:cid` | Author/Admin | Delete comment |

---

## Task Status State Machine

The backend enforces valid transitions. The frontend uses a status dropdown — invalid transitions are rejected by the API.

```
              ┌──────────────────────────────────┐
              ▼                                  │
          ┌───────┐        ┌─────────────┐       │
          │  TODO │───────►│ IN_PROGRESS │───────┤
          └───────┘        └─────────────┘       │
              │                   │              │
              │            ┌──────▼──────┐       │
              │            │  IN_REVIEW  │       │
              │            └──────┬──────┘       │
              │                   │              │
              │            ┌──────▼──────┐       │
              └───────────►│   DONE      │       │
                           └─────────────┘       │
                                                 │
                    ┌────────────────────────────►│
                    │       CANCELLED             │
                    └─────────────────────────────┘
```

`DONE` and `CANCELLED` are terminal — no outbound transitions.

---

## Frontend State Management

No global state library. Three sources of truth:

| Source | What lives there |
|---|---|
| `AuthContext` | `token`, `user` — persisted to `localStorage`, survives page refresh |
| Component `useState` | Page-level data (project list, task list) — fetched on mount |
| URL params | Which project is active (`/projects/:projectId`) |

This is intentionally minimal. When data-fetching complexity grows (pagination, caching, background revalidation), the migration path is React Query — it slots in as a drop-in replacement for the `useEffect` + `useState` fetch pattern used today.

---

## Security Considerations

| Concern | Current approach | Production hardening |
|---|---|---|
| Token storage | `localStorage` | Switch to `HttpOnly` cookie + CSRF token for XSS resistance |
| JWT secret | Env var (`JWT_SECRET`) | Rotate via secrets manager; set short TTL + refresh tokens |
| CORS | Allowlist via `CORS_ALLOWED_ORIGINS` env var | Restrict to exact production origin |
| Password hashing | BCrypt (cost factor 10) | Adequate; increase cost if hardware allows |
| SQL injection | Spring Data JPA parameterized queries | No raw SQL |

---

## Deployment

**Dev:** `./mvnw spring-boot:run` (H2, no Docker needed) + `npm run dev`

**Prod:** Docker Compose spins up PostgreSQL; Spring Boot reads env vars for DB creds, JWT secret, and CORS origins.

```
docker compose up -d
SPRING_PROFILES_ACTIVE=prod \
  DB_URL=jdbc:postgresql://localhost:5432/taskflow \
  DB_USER=appuser DB_PASSWORD=... \
  JWT_SECRET=... CORS_ALLOWED_ORIGINS=https://app.yourdomain.com \
  ./mvnw spring-boot:run
```
