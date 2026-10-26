
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="page">
      <h1>Online Quiz System</h1>
      <p>
        Browse quizzes by topic, attempt them once under a timer and see your
        score instantly.
      </p>
      <Link to="/register">Create a student account</Link>
    </main>
  );
}

