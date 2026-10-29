
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function AttemptResult() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get(`/attempts/${attemptId}/result`)
      .then((res) => {
        if (active) setResult(res.data.result);
      })
      .catch((err) => {
        if (active) {
          setError(
            err.response?.status === 401
              ? 'Please log in to view this result.'
              : 'Could not load this result.'
          );
        }
      });

    return () => {
      active = false;
    };
  }, [attemptId]);

  if (error) {
    return (
      <main className="page">
        <p role="alert">{error}</p>
        <Link to="/quizzes">Back to quizzes</Link>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="page">
        <p role="status">Loading result...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Quiz Result</h1>
      <p>
        Score: <strong>{result.score}</strong>
      </p>
      <p>Status: {result.status}</p>
      <p>
        Submitted: {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : '—'}
      </p>
      <Link to="/quizzes">Back to quizzes</Link>
    </main>
  );
}

