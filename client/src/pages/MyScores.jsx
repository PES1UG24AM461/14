import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function MyScores() {
  const [scores, setScores] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get('/me/scores')
      .then((res) => {
        if (!active) return;
        setScores(res.data.scores ?? []);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.error || 'Could not load your scores.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page">
      <h1>My Scores</h1>
      {status === 'loading' && <p role="status">Loading scores...</p>}
      {status === 'error' && <p role="alert">{error}</p>}
      {status === 'ready' && scores.length === 0 && <p>No completed attempts yet.</p>}
      {status === 'ready' && scores.length > 0 && (
        <ul>
          {scores.map((attempt, index) => (
            <li key={index}>
              <strong>{attempt.quizTitle}</strong> - Score: <strong>{attempt.score}</strong> -
              Submitted:{' '}
              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '-'}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
