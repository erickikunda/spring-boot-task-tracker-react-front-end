import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { archiveProject, getProject } from '../api/projects';
import { createTask, listTasks, updateTaskStatus } from '../api/tasks';
import type { Priority, ProjectResponse, TaskResponse, TaskStatus } from '../api/types';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const PAGE_SIZE = 20;

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [taskPageNum, setTaskPageNum] = useState(0);
  const [tasksLast, setTasksLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), listTasks(projectId, { size: PAGE_SIZE })])
      .then(([proj, page]) => {
        setProject(proj);
        setTasks(page.content);
        setTasksLast(page.last);
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function loadMore() {
    if (!projectId) return;
    setLoadingMore(true);
    try {
      const next = taskPageNum + 1;
      const page = await listTasks(projectId, { page: next, size: PAGE_SIZE });
      setTasks((prev) => [...prev, ...page.content]);
      setTaskPageNum(next);
      setTasksLast(page.last);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setCreateError('');
    setCreating(true);
    try {
      const t = await createTask(projectId, {
        title,
        description: taskDesc || undefined,
        priority,
        dueDate: dueDate || undefined,
      });
      setTasks((prev) => [t, ...prev]);
      setTitle('');
      setTaskDesc('');
      setPriority('MEDIUM');
      setDueDate('');
      setShowForm(false);
    } catch {
      setCreateError('Failed to create task.');
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(task: TaskResponse, status: TaskStatus) {
    if (!projectId) return;
    try {
      const updated = await updateTaskStatus(projectId, task.id, status);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      // backend enforces valid transitions — silently ignore
    }
  }

  async function handleArchive() {
    if (!projectId || !project) return;
    if (!window.confirm(`Archive "${project.name}"? Members will lose write access.`)) return;
    try {
      setProject(await archiveProject(projectId));
    } catch {
      // ignore
    }
  }

  if (loading) return <p style={{ padding: '2rem', textAlign: 'center' }}>Loading…</p>;
  if (error) return <p role="alert" style={{ padding: '2rem' }}>{error}</p>;
  if (!project) return null;

  return (
    <main>
      <nav>
        <Link to="/dashboard">← Dashboard</Link>
      </nav>

      <div className="page-header">
        <h1>{project.name}</h1>
        {project.status === 'ACTIVE' && (
          <button type="button" onClick={handleArchive}>
            Archive
          </button>
        )}
      </div>

      {project.description && <p>{project.description}</p>}
      <p className="meta">
        Status: {project.status} · Owner: {project.owner.displayName}
      </p>

      <section>
        <div className="section-header">
          <h2>Tasks</h2>
          <button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New task'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateTask}>
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
              />
            </label>
            <label>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            {createError && <p role="alert">{createError}</p>}
            <button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create task'}
            </button>
          </form>
        )}

        {tasks.length === 0 && !showForm && (
          <p className="empty">No tasks yet. Create one above.</p>
        )}

        <ul>
          {tasks.map((t) => (
            <li key={t.id} className="list-item">
              <Link to={`/projects/${projectId}/tasks/${t.id}`}>{t.title}</Link>
              <select
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="item-meta">
                {t.priority}
                {t.assignee && ` · ${t.assignee.displayName}`}
                {t.dueDate && ` · due ${t.dueDate}`}
              </span>
            </li>
          ))}
        </ul>

        {!tasksLast && (
          <button
            type="button"
            className="load-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </section>
    </main>
  );
}
