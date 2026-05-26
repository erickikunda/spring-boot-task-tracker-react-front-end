import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addMember, archiveProject, getProject, getProjectMembers, removeMember } from '../api/projects';
import { createTask, listTasks, updateTaskStatus } from '../api/tasks';
import { listUsers } from '../api/users';
import type { Priority, ProjectResponse, TaskResponse, TaskStatus, UserResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/date';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const FILTER_OPTIONS: Array<{ label: string; value: TaskStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'To do', value: 'TODO' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'In review', value: 'IN_REVIEW' },
  { label: 'Done', value: 'DONE' },
  { label: 'Cancelled', value: 'CANCELLED' },
];
const PAGE_SIZE = 20;

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user: currentUser } = useAuth();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [members, setMembers] = useState<UserResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [taskPage, setTaskPage] = useState(0);
  const [tasksLast, setTasksLast] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [addMemberId, setAddMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Load project metadata, members, and full user list once per projectId
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([getProject(projectId), getProjectMembers(projectId), listUsers()])
      .then(([proj, memberList, usersPage]) => {
        setProject(proj);
        setMembers(memberList);
        setUsers(usersPage.content);
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Reload tasks whenever projectId or status filter changes
  useEffect(() => {
    if (!projectId) return;
    setTasksLoading(true);
    setTasks([]);
    setTaskPage(0);
    setTasksLast(true);
    const params = statusFilter === 'ALL'
      ? { size: PAGE_SIZE }
      : { status: statusFilter as TaskStatus, size: PAGE_SIZE };
    listTasks(projectId, params)
      .then((page) => {
        setTasks(page.content);
        setTasksLast(page.last);
      })
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, [projectId, statusFilter]);

  async function loadMore() {
    if (!projectId) return;
    setLoadingMore(true);
    try {
      const next = taskPage + 1;
      const params = statusFilter === 'ALL'
        ? { page: next, size: PAGE_SIZE }
        : { status: statusFilter as TaskStatus, page: next, size: PAGE_SIZE };
      const page = await listTasks(projectId, params);
      setTasks((prev) => [...prev, ...page.content]);
      setTaskPage(next);
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
      // backend enforces valid transitions
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

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !addMemberId) return;
    setAddingMember(true);
    try {
      await addMember(projectId, addMemberId);
      const updated = await getProjectMembers(projectId);
      setMembers(updated);
      setAddMemberId('');
    } catch {
      // ignore
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!projectId) return;
    try {
      await removeMember(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch {
      // ignore
    }
  }

  if (loading) return <p style={{ padding: '2rem', textAlign: 'center' }}>Loading…</p>;
  if (error) return <p role="alert" style={{ padding: '2rem' }}>{error}</p>;
  if (!project) return null;

  const isOwner = currentUser?.id === project.owner.id;
  const memberIdSet = new Set(members.map((m) => m.id));
  const addableUsers = users.filter((u) => !memberIdSet.has(u.id));

  return (
    <main>
      <nav>
        <Link to="/dashboard">← Dashboard</Link>
      </nav>

      <div className="page-header">
        <h1>{project.name}</h1>
        {isOwner && project.status === 'ACTIVE' && (
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

        <div className="filter-bar">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={statusFilter === opt.value ? 'active' : undefined}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
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

        {tasksLoading && <p>Loading tasks…</p>}
        {!tasksLoading && tasks.length === 0 && !showForm && (
          <p className="empty">
            {statusFilter === 'ALL' ? 'No tasks yet. Create one above.' : 'No tasks match this filter.'}
          </p>
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
                {t.dueDate && ` · due ${formatDate(t.dueDate)}`}
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

      <section>
        <div className="section-header">
          <h2>Members ({members.length})</h2>
        </div>

        <ul>
          {members.map((m) => (
            <li key={m.id} className="list-item">
              <span style={{ flex: 1 }}>{m.displayName}</span>
              <span className="item-meta">{m.email}</span>
              {m.id === project.owner.id ? (
                <span className="pill pill-done">owner</span>
              ) : isOwner ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleRemoveMember(m.id)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {isOwner && addableUsers.length > 0 && (
          <form onSubmit={handleAddMember}>
            <label>
              Add member
              <select value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)}>
                <option value="">Select a user…</option>
                {addableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={addingMember || !addMemberId}>
              {addingMember ? 'Adding…' : 'Add member'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
