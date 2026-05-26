# TaskFlow — React Frontend

React + TypeScript frontend for the TaskFlow REST API. Users can register, log in, manage projects, and track tasks.

## Tech Stack

| Layer | Choice |
|---|---|
| UI framework | React 19 |
| Language | TypeScript 6 |
| Build tool | Vite 8 |
| Router | React Router 7 |
| HTTP client | Axios (with JWT interceptors) |

## Prerequisites

- Node.js 20+
- The [TaskFlow backend](../demo3) running on `http://localhost:8080`

## Setup

```bash
npm install
```

The default `.env` already points at the local backend. If you need a different URL, override it:

```bash
echo "VITE_API_BASE_URL=http://your-backend" > .env.local
```

## Running

```bash
npm run dev        # dev server → http://localhost:5173 (port is pinned)
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend base URL. Override in `.env.local` — never commit secrets here. |

## Project Structure

```
src/
  api/
    client.ts       # Axios instance — injects Bearer token, clears on 401
    types.ts        # TypeScript mirrors of all backend DTOs
    auth.ts         # register(), login()
    projects.ts     # listProjects(), getProject(), createProject(), archiveProject()
    tasks.ts        # listTasks(), createTask(), updateTaskStatus(), assignTask(), deleteTask()
  context/
    AuthContext.tsx # token + user state, login/register/logout actions, useAuth() hook
  components/
    ProtectedRoute.tsx  # redirects to /login when unauthenticated
    GuestRoute.tsx      # redirects to /dashboard when already authenticated
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    DashboardPage.tsx   # project list + create project
    ProjectPage.tsx     # task list + create task + status updates
  App.tsx           # provider tree + route definitions
  main.tsx          # entry point
```

## Routes

| Path | Guard | Description |
|---|---|---|
| `/login` | Guest only | Email + password login |
| `/register` | Guest only | New account registration |
| `/dashboard` | Auth required | Lists all projects you belong to |
| `/projects/:id` | Auth required | Project detail with task list |
| `*` | — | Redirects to `/dashboard` |

## Auth Flow

1. `POST /api/v1/auth/register` or `/login` → backend returns `{ token, user }`
2. Token and user are stored in `localStorage` and held in `AuthContext`
3. Every Axios request gets `Authorization: Bearer <token>` injected by a request interceptor
4. On a `401` response, the interceptor removes the token from `localStorage`; the next navigation to a protected route redirects to `/login`
5. `GuestRoute` prevents authenticated users from re-visiting `/login` or `/register`
