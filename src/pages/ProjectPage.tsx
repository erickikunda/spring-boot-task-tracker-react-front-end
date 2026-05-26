import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject } from '../api/projects';
import { createTask, listTasks, updateTaskStatus } from '../api/tasks';
import type { Priority, ProjectResponse, TaskResponse, TaskStatus } from '../api/types';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
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
    Promise.all([getProject(projectId), listTasks(projectId)])
      .then(([proj, page]) => {
        setProject(proj);
        setTasks(page.content);
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [projectId]);

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
      // Backend rejects invalid transitions — optimistic update skipped; UI stays consistent
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!project) return null;

  return (
    <main>
      <nav>
        <Link to="/dashboard">← Dashboard</Link>
      </nav>
      <h1>{project.name}</h1>
      {project.description && <p>{project.description}</p>}
      <p>
        Status: {project.status} · Owner: {project.owner.displayName}
      </p>

      <section>
        <h2>Tasks</h2>
        <button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New task'}
        </button>

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

        {tasks.length === 0 && !showForm && <p>No tasks yet.</p>}
        <ul>
          {tasks.map((t) => (
            <li key={t.id}>
              <Link to={`/projects/${projectId}/tasks/${t.id}`}>
                <strong>{t.title}</strong>
              </Link>{' '}
              <select
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>{' '}
              <span>{t.priority}</span>
              {t.assignee && <span> → {t.assignee.displayName}</span>}
              {t.dueDate && <span> · due {t.dueDate}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
