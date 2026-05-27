import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { batchUpdateStatus, createProject, listProjects } from '../api/projects';
import type { BatchUpdateResult, ProjectResponse, ProjectStatus } from '../api/types';
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

  // Batch update — ADMIN only
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<ProjectStatus>('ARCHIVED');
  const [batchSize, setBatchSize] = useState(500);
  const [batching, setBatching] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchUpdateResult | null>(null);
  const [batchError, setBatchError] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  // Drive the indeterminate state — can only be set via the DOM property, not an attribute.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < projects.length;
    }
  }, [selectedIds.size, projects.length]);

  function toggleProject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBatchResult(null);
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.size === projects.length ? new Set() : new Set(projects.map((p) => p.id)),
    );
    setBatchResult(null);
  }

  async function handleBatchUpdate(e: FormEvent) {
    e.preventDefault();
    setBatchError('');
    setBatching(true);
    try {
      const result = await batchUpdateStatus(Array.from(selectedIds), batchStatus, batchSize);
      // Update affected rows in local state — no round-trip needed.
      setProjects((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, status: batchStatus } : p)),
      );
      setSelectedIds(new Set());
      setBatchResult(result);
    } catch {
      setBatchError('Batch update failed. Check your permissions and try again.');
    } finally {
      setBatching(false);
    }
  }

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

        {isAdmin && projects.length > 0 && (
          <label className="select-all-label">
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={selectedIds.size === projects.length && projects.length > 0}
              onChange={toggleAll}
            />
            Select all
          </label>
        )}

        <ul>
          {projects.map((p) => (
            <li key={p.id} className="list-item">
              {isAdmin && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleProject(p.id)}
                  aria-label={`Select ${p.name}`}
                />
              )}
              <Link to={`/projects/${p.id}`}>{p.name}</Link>
              <span className="item-meta">
                {p.status} · {formatRelative(p.createdAt)}
              </span>
            </li>
          ))}
        </ul>

        {isAdmin && selectedIds.size > 0 && (
          <form className="batch-bar" onSubmit={handleBatchUpdate}>
            <p className="batch-bar-label">
              {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="batch-bar-controls">
              <label>
                Set status
                <select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value as ProjectStatus)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label>
                Batch size
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                />
              </label>
              <button type="submit" disabled={batching}>
                {batching ? 'Updating…' : 'Apply'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBatchResult(null);
                }}
              >
                Clear
              </button>
            </div>
            {batchError && <p role="alert">{batchError}</p>}
          </form>
        )}

        {batchResult && (
          <p className="batch-result">
            ✓ Updated {batchResult.updatedCount} project
            {batchResult.updatedCount !== 1 ? 's' : ''} in {batchResult.batchCount} batch
            {batchResult.batchCount !== 1 ? 'es' : ''} (chunk size: {batchResult.batchSize})
          </p>
        )}
      </section>
    </main>
  );
}
