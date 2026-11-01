import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function QuizManagement() {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get('/manage/quizzes')
      .then((res) => {
        if (active) setQuizzes(res.data.quizzes || []);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 401) {
          setError('Please log in as faculty or administrator to manage quizzes.');
        } else if (err.response?.status === 403) {
          setError('Faculty or administrators only');
        } else {
          setError('Could not load quizzes for management.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <main className="page">
        <h1>Quiz Management</h1>
        <p role="alert">{error}</p>
        <Link to="/quizzes">Back to quizzes</Link>
      </main>
    );
  }

  if (quizzes === null) {
    return (
      <main className="page">
        <h1>Quiz Management</h1>
        <p role="status">Loading managed quizzes...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Quiz Management</h1>
      <p>Create, edit, and publish quizzes.</p>

      {quizzes.length === 0 ? (
        <p>No quizzes created yet.</p>
      ) : (
        <ul aria-label="Manageable quizzes">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <strong>{quiz.title}</strong> — {quiz.topic} ({quiz.status}) | {quiz.questionCount}{' '}
              {quiz.questionCount === 1 ? 'question' : 'questions'}
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link to="/quizzes">Back to quizzes</Link>
      </p>
    </main>
  );
}
