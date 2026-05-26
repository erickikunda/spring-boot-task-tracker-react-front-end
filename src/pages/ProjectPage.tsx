import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject } from '../api/projects';
import { listTasks } from '../api/tasks';
import type { ProjectResponse, TaskResponse } from '../api/types';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        {tasks.length === 0 && <p>No tasks yet.</p>}
        <ul>
          {tasks.map((t) => (
            <li key={t.id}>
              <strong>{t.title}</strong> <span>[{t.status}]</span>{' '}
              <span>{t.priority}</span>
              {t.assignee && <span> → {t.assignee.displayName}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
