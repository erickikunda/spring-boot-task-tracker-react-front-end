import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createUser, getUserProjects, listUsers, updateUserRole } from '../api/users';
import type { ProjectResponse, Role, UserResponse } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { formatRelative } from '../utils/date';

const ROLES: Role[] = ['MEMBER', 'MANAGER', 'ADMIN'];

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('MEMBER');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Track per-user role-change errors
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});

  // Per-user project panel state
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [userProjects, setUserProjects] = useState<Record<string, ProjectResponse[]>>({});
  const [projectsLoading, setProjectsLoading] = useState<Record<string, boolean>>({});
  const [projectsError, setProjectsError] = useState<Record<string, string>>({});

  useEffect(() => {
    listUsers(0, 200)
      .then((page) => setUsers(page.content))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, role: Role) {
    setRoleErrors((prev) => ({ ...prev, [userId]: '' }));
    try {
      const updated = await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch {
      setRoleErrors((prev) => ({ ...prev, [userId]: 'Failed to update role.' }));
    }
  }

  async function toggleProjects(userId: string) {
    const nowExpanded = !expandedUsers[userId];
    setExpandedUsers((prev) => ({ ...prev, [userId]: nowExpanded }));

    if (nowExpanded && !userProjects[userId]) {
      setProjectsLoading((prev) => ({ ...prev, [userId]: true }));
      setProjectsError((prev) => ({ ...prev, [userId]: '' }));
      try {
        const projects = await getUserProjects(userId);
        setUserProjects((prev) => ({ ...prev, [userId]: projects }));
      } catch {
        setProjectsError((prev) => ({ ...prev, [userId]: 'Failed to load projects.' }));
      } finally {
        setProjectsLoading((prev) => ({ ...prev, [userId]: false }));
      }
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const u = await createUser(email, displayName, password, newRole);
      setUsers((prev) => [u, ...prev]);
      setEmail('');
      setDisplayName('');
      setPassword('');
      setNewRole('MEMBER');
      setShowForm(false);
    } catch {
      setCreateError('Failed to create user. Email may already be registered.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <div className="page-header">
        <h1>User Management</h1>
        <nav>
          <Link to="/dashboard">← Dashboard</Link>
        </nav>
      </div>

      <section>
        <div className="section-header">
          <h2>Create user</h2>
          <button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New user'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate}>
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                autoFocus
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              Role
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            {createError && <p role="alert">{createError}</p>}
            <button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create user'}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2>All users ({users.length})</h2>

        {loading && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && users.length === 0 && (
          <p className="empty">No users found.</p>
        )}

        <ul>
          {users.map((u) => (
            <li key={u.id} className="list-item">
              <div className="user-info">
                <span className="user-name">
                  {u.displayName}
                  {u.id === currentUser?.id && (
                    <span className="user-you"> (you)</span>
                  )}
                </span>
                <span className="item-meta">{u.email} · {formatRelative(u.createdAt)}</span>
              </div>
              <div className="user-role-cell">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                  aria-label={`Role for ${u.displayName}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {roleErrors[u.id] && (
                  <span className="role-error">{roleErrors[u.id]}</span>
                )}
                <button type="button" onClick={() => toggleProjects(u.id)}>
                  {expandedUsers[u.id] ? 'Hide projects' : 'Projects'}
                </button>
              </div>

              {expandedUsers[u.id] && (
                <div className="user-projects">
                  {projectsLoading[u.id] && <p>Loading…</p>}
                  {projectsError[u.id] && <p role="alert">{projectsError[u.id]}</p>}
                  {userProjects[u.id] && userProjects[u.id].length === 0 && (
                    <p className="empty">No project memberships.</p>
                  )}
                  {userProjects[u.id]?.map((p) => (
                    <div key={p.id} className="user-project-item">
                      <span className="user-project-name">{p.name}</span>
                      <span className="item-meta">
                        {p.status} · owner: {p.owner.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
