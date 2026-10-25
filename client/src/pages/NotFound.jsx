import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">Go to Home</Link>
    </main>
  );
}
