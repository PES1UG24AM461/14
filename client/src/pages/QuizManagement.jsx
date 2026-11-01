import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import QuizForm from '../components/QuizForm.jsx';
import { formatDuration } from '../utils/format.js';

// Quiz Management page for faculty and administrators (FR-008 to FR-012): list own quizzes,
// create and edit drafts, publish / unpublish, and delete drafts. The API enforces ownership.
export default function QuizManagement() {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null); // null, { quiz: null } for a new quiz, or { quiz }
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

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
  }, [reloadKey]);

  async function run(action, success) {
    setMessage('');
    setActionError('');
    try {
      await action();
      setMessage(success);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  }

  function publish(quiz) {
    if (!window.confirm(`Publish "${quiz.title}"? Students will be able to take it.`)) return;
    run(() => api.post(`/quizzes/${quiz.id}/publish`), `"${quiz.title}" is now published.`);
  }

  function unpublish(quiz) {
    if (!window.confirm(`Unpublish "${quiz.title}"? Students will no longer see it.`)) return;
    run(() => api.post(`/quizzes/${quiz.id}/unpublish`), `"${quiz.title}" is back to draft.`);
  }

  function remove(quiz) {
    if (!window.confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
    run(() => api.delete(`/quizzes/${quiz.id}`), `"${quiz.title}" was deleted.`);
  }

  async function edit(quiz) {
    setMessage('');
    setActionError('');
    try {
      const res = await api.get(`/manage/quizzes/${quiz.id}`);
      setEditing({ quiz: res.data.quiz });
    } catch (err) {
      setActionError(err.response?.data?.error || 'Could not open this quiz for editing.');
    }
  }

  async function save(payload) {
    const existing = editing.quiz;
    if (existing) await api.patch(`/quizzes/${existing.id}`, payload);
    else await api.post('/quizzes', payload);
    setEditing(null);
    setMessage(existing ? 'Changes saved.' : 'Quiz saved as a draft.');
    setReloadKey((k) => k + 1);
  }

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

  if (editing) {
    return (
      <main className="page">
        <QuizForm quiz={editing.quiz} onSave={save} onCancel={() => setEditing(null)} />
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Quiz Management</h1>
      <p>Create, edit, and publish quizzes.</p>
      <button type="button" onClick={() => setEditing({ quiz: null })}>
        New quiz
      </button>

      {message && <p role="status">{message}</p>}
      {actionError && <p role="alert">{actionError}</p>}

      {quizzes.length === 0 ? (
        <p>No quizzes created yet.</p>
      ) : (
        <ul aria-label="Manageable quizzes" className="quiz-list">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <strong>{quiz.title}</strong> — {quiz.topic} ({quiz.status}) | {quiz.questionCount}{' '}
              {quiz.questionCount === 1 ? 'question' : 'questions'}
              {quiz.durationSeconds ? ` | ${formatDuration(quiz.durationSeconds)}` : ''}
              <div className="actions">
                {quiz.status === 'draft' ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Edit ${quiz.title}`}
                      onClick={() => edit(quiz)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Publish ${quiz.title}`}
                      onClick={() => publish(quiz)}
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${quiz.title}`}
                      onClick={() => remove(quiz)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label={`Unpublish ${quiz.title}`}
                    onClick={() => unpublish(quiz)}
                  >
                    Unpublish
                  </button>
                )}
              </div>
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
