import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <h1>404</h1>
      <p style={{ marginTop: '0.5rem' }}>Page not found.</p>
      <Link to="/dashboard" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
        ← Back to dashboard
      </Link>
    </main>
  );
}
