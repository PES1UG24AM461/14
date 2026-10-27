import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { formatDuration } from '../utils/format.js';

// Quiz Topics page (FR-005): published quizzes grouped by topic, with loading, empty and error states (SAD 4.6).
export default function QuizTopics() {
  const [topics, setTopics] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    api
      .get('/quizzes')
      .then((res) => {
        if (!active) return;
        setTopics(res.data.topics);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page">
      <h1>Quiz Topics</h1>
      {status === 'loading' && <p role="status">Loading quizzes...</p>}
      {status === 'error' && <p role="alert">Could not load quizzes. Please try again later.</p>}
      {status === 'ready' && topics.length === 0 && <p>No quizzes are available yet.</p>}
      {status === 'ready' &&
        topics.map(({ topic, quizzes }) => (
          <section key={topic} aria-labelledby={`topic-${topic}`}>
            <h2 id={`topic-${topic}`}>{topic}</h2>
            <ul>
              {quizzes.map((quiz) => (
                <li key={quiz.id}>
                  <Link to={`/quizzes/${quiz.id}`}>{quiz.title}</Link>
                  {' — '}
                  {quiz.questionCount} questions, {formatDuration(quiz.durationSeconds)}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </main>
  );
}
