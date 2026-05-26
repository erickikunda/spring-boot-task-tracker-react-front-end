import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createComment, deleteComment, listComments } from '../api/comments';
import { assignTask, deleteTask, getTask, unassignTask, updateTaskStatus } from '../api/tasks';
import { listUsers } from '../api/users';
import type { CommentResponse, TaskResponse, TaskStatus, UserResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];

export default function TaskPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [task, setTask] = useState<TaskResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    if (!projectId || !taskId) return;
    Promise.all([getTask(projectId, taskId), listComments(taskId), listUsers()])
      .then(([t, c, usersPage]) => {
        setTask(t);
        setComments(c);
        setUsers(usersPage.content);
      })
      .catch(() => setError('Failed to load task.'))
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  async function handleStatusChange(status: TaskStatus) {
    if (!projectId || !taskId) return;
    try {
      setTask(await updateTaskStatus(projectId, taskId, status));
    } catch {
      // backend enforces valid transitions — silently ignore invalid ones
    }
  }

  async function handleAssigneeChange(assigneeId: string) {
    if (!projectId || !taskId || !task) return;
    try {
      if (assigneeId) {
        setTask(await assignTask(projectId, taskId, assigneeId));
      } else {
        await unassignTask(projectId, taskId);
        setTask({ ...task, assignee: null });
      }
    } catch {
      // ignore
    }
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!taskId) return;
    setCommentError('');
    setSubmitting(true);
    try {
      const c = await createComment(taskId, body);
      setComments((prev) => [...prev, c]);
      setBody('');
    } catch {
      setCommentError('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!taskId) return;
    try {
      await deleteComment(taskId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // ignore
    }
  }

  async function handleDeleteTask() {
    if (!projectId || !taskId) return;
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteTask(projectId, taskId);
      navigate(`/projects/${projectId}`, { replace: true });
    } catch {
      // ignore
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!task) return null;

  return (
    <main>
      <nav>
        <Link to={`/projects/${projectId}`}>← Back to project</Link>
      </nav>

      <h1>{task.title}</h1>
      {task.description && <p className="meta">{task.description}</p>}

      <section>
        <h2>Details</h2>
        <dl>
          <dt>Status</dt>
          <dd>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </dd>

          <dt>Priority</dt>
          <dd>{task.priority}</dd>

          {task.dueDate && (
            <>
              <dt>Due</dt>
              <dd>{task.dueDate}</dd>
            </>
          )}

          <dt>Reporter</dt>
          <dd>{task.reporter.displayName}</dd>

          <dt>Assignee</dt>
          <dd>
            <select
              value={task.assignee?.id ?? ''}
              onChange={(e) => handleAssigneeChange(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </dd>
        </dl>
      </section>

      <section>
        <div className="section-header">
          <h2>Comments ({comments.length})</h2>
        </div>
        {comments.length === 0 && <p className="empty">No comments yet.</p>}
        <ul>
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment-body">
                <span className="comment-author">{c.author.displayName}</span>
                {' '}{c.body}
              </div>
              {c.author.id === currentUser?.id && (
                <button type="button" onClick={() => handleDeleteComment(c.id)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddComment}>
          <label>
            Add a comment
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={10000}
            />
          </label>
          {commentError && <p role="alert">{commentError}</p>}
          <button type="submit" disabled={submitting || !body.trim()}>
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      </section>

      <section className="danger">
        <h2>Danger zone</h2>
        <button type="button" className="btn-danger" onClick={handleDeleteTask}>
          Delete task
        </button>
      </section>
    </main>
  );
}
