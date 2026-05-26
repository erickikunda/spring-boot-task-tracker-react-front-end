import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects } from '../api/projects';
import type { ProjectResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <header>
        <h1>Dashboard</h1>
        <p>Welcome, {user?.displayName}</p>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </header>

      <section>
        <h2>Projects</h2>
        {loading && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && projects.length === 0 && <p>No projects yet.</p>}
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`}>{p.name}</Link>{' '}
              <span>({p.status})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
