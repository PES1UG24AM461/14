import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { formatDuration } from '../utils/format.js';

// Quiz details page (FR-006): title, topic, duration and question count before an attempt.
export default function QuizDetail() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .get(`/quizzes/${quizId}`)
      .then((res) => {
        if (!active) return;
        setQuiz(res.data.quiz);
        setStatus('ready');
      })
      .catch((err) => active && setStatus(err.response?.status === 404 ? 'missing' : 'error'));
    return () => {
      active = false;
    };
  }, [quizId]);

  return (
    <main className="page">
      {status === 'loading' && <p role="status">Loading quiz...</p>}
      {status === 'missing' && <p role="alert">This quiz is not available.</p>}
      {status === 'error' && <p role="alert">Could not load the quiz. Please try again later.</p>}
      {status === 'ready' && (
        <>
          <h1>{quiz.title}</h1>
          <dl>
            <dt>Topic</dt>
            <dd>{quiz.topic}</dd>
            <dt>Duration</dt>
            <dd>{formatDuration(quiz.durationSeconds)}</dd>
            <dt>Questions</dt>
            <dd>{quiz.questionCount}</dd>
          </dl>
          <p>You can attempt this quiz once. The timer starts when you begin.</p>
        </>
      )}
      <Link to="/quizzes">Back to all quizzes</Link>
    </main>
  );
}
