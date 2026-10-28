import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { createServerClock, formatClock, remainingMs } from '../utils/countdown.js';

const START_ERRORS = {
  401: 'Please log in as a student to take this quiz.',
  403: 'Only students can take quizzes.',
  404: 'This quiz is not available.',
  409: 'You have already completed this quiz.',
};

// Take Quiz page (FR-013, FR-014, FR-015): starts or resumes the attempt, shows one question at a time,
// a countdown from the server deadline, and saves each selected answer immediately.
export default function TakeQuiz() {
  const { quizId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const serverNow = useRef(Date.now);

  useEffect(() => {
    let active = true;
    api
      .post(`/quizzes/${quizId}/attempts`)
      .then((res) => {
        if (!active) return;
        serverNow.current = createServerClock(res.data.serverTime);
        setAttempt(res.data.attempt);
        setQuestions(res.data.questions);
        setAnswers(
          Object.fromEntries(res.data.attempt.answers.map((a) => [a.questionId, a.selectedOption]))
        );
      })
      .catch((err) => {
        if (active) setError(START_ERRORS[err.response?.status] || 'Could not start the quiz.');
      });
    return () => {
      active = false;
    };
  }, [quizId]);

  // The countdown is only a display; the server deadline is what decides (NFR-003).
  useEffect(() => {
    if (!attempt) return undefined;
    const tick = () => setTimeLeft(remainingMs(attempt.deadlineAt, serverNow.current()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  async function choose(questionId, selectedOption) {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
    setSaveState('Saving...');
    try {
      await api.patch(`/attempts/${attempt.id}/answers`, {
        answers: [{ questionId, selectedOption }],
      });
      setSaveState('Answer saved');
    } catch (err) {
      setSaveState(
        err.response?.status === 409
          ? 'Time is up - answers can no longer be changed.'
          : 'Could not save your answer. Please try again.'
      );
    }
  }

  if (error) {
    return (
      <main className="page">
        <p role="alert">{error}</p>
        <Link to="/quizzes">Back to all quizzes</Link>
      </main>
    );
  }
  if (!attempt) {
    return (
      <main className="page">
        <p role="status">Starting quiz...</p>
      </main>
    );
  }

  const question = questions[current];
  const timeUp = timeLeft === 0;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <main className="page">
      <p aria-live="polite">
        Time left: <strong>{timeLeft === null ? '--:--' : formatClock(timeLeft)}</strong>
      </p>
      <p>
        Question {current + 1} of {questions.length} · {answeredCount} answered
      </p>
      {timeUp && (
        <p role="alert">
          Time is up. The answers you saved before the deadline have been submitted.
        </p>
      )}

      {question && (
        <fieldset disabled={timeUp}>
          <legend>{question.prompt}</legend>
          {question.options.map((option, index) => (
            <label key={option} style={{ display: 'block' }}>
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={answers[question.id] === index}
                onChange={() => choose(question.id, index)}
              />{' '}
              {option}
            </label>
          ))}
        </fieldset>
      )}

      <div>
        <button type="button" onClick={() => setCurrent((i) => i - 1)} disabled={current === 0}>
          Previous
        </button>{' '}
        <button
          type="button"
          onClick={() => setCurrent((i) => i + 1)}
          disabled={current === questions.length - 1}
        >
          Next
        </button>
      </div>
      {saveState && <p role="status">{saveState}</p>}
    </main>
  );
}
