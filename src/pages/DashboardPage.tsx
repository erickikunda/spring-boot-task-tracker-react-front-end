import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createProject, listProjects } from '../api/projects';
import type { ProjectResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { formatRelative } from '../utils/date';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const p = await createProject(name, description);
      setProjects((prev) => [p, ...prev]);
      setName('');
      setDescription('');
      setShowForm(false);
    } catch {
      setCreateError('Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome, {user?.displayName}</p>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>

      <section>
        <div className="section-header">
          <h2>Projects</h2>
          <button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New project'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate}>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {createError && <p role="alert">{createError}</p>}
            <button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create project'}
            </button>
          </form>
        )}

        {loading && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && projects.length === 0 && (
          <p className="empty">No projects yet. Create one above.</p>
        )}

        <ul>
          {projects.map((p) => (
            <li key={p.id} className="list-item">
              <Link to={`/projects/${p.id}`}>{p.name}</Link>
              <span className="item-meta">
                {p.status} · {formatRelative(p.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
