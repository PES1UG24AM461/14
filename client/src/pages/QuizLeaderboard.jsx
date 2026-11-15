import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { getStoredToken } from '../utils/auth.js';

// Quiz Leaderboard page (FR-022, FR-023): finished attempts of one quiz, highest score first;
// equal scores are ordered by earlier submission (ranking is done by the server).
export default function QuizLeaderboard() {
  const { quizId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const loggedIn = Boolean(getStoredToken());

  useEffect(() => {
    if (!loggedIn) return undefined;
    let active = true;
    api
      .get(`/quizzes/${quizId}/leaderboard`)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err) => {
        if (!active) return;
        const status = err.response?.status;
        if (status === 401) setError('Please log in to view the leaderboard.');
        else if (status === 404 || status === 400) setError('This quiz is not available.');
        else setError('Could not load the leaderboard. Please try again later.');
      });
    return () => {
      active = false;
    };
  }, [quizId, loggedIn]);

  if (!loggedIn) {
    return (
      <main className="page">
        <h1>Leaderboard</h1>
        <p>
          Please <Link to="/login">log in</Link> to view the leaderboard.
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <h1>Leaderboard</h1>
        <p role="alert">{error}</p>
        <Link to="/quizzes">Back to quizzes</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page">
        <h1>Leaderboard</h1>
        <p role="status">Loading leaderboard...</p>
      </main>
    );
  }

  const { quiz, entries } = data;

  return (
    <main className="page">
      <h1>Leaderboard: {quiz.title}</h1>
      <p>Highest score first. On equal scores, the earlier submission ranks higher.</p>

      {entries.length === 0 ? (
        <p>No one has finished this quiz yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="leaderboard">
            <caption className="visually-hidden">Leaderboard for {quiz.title}</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Student</th>
                <th scope="col">Score</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.rank}
                  className={entry.isMe ? 'is-me' : undefined}
                  aria-current={entry.isMe ? 'true' : undefined}
                >
                  <td>{entry.rank}</td>
                  <td>
                    {entry.name}
                    {entry.isMe && ' (you)'}
                  </td>
                  <td>
                    {entry.score} / {quiz.questionCount}
                  </td>
                  <td>{new Date(entry.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p>
        <Link to={`/quizzes/${quiz.id}`}>Back to quiz</Link>
      </p>
    </main>
  );
}
