
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { createServerClock, formatClock, remainingMs } from '../utils/countdown.js';

const START_ERRORS = {
  401: 'Please log in as a student to take this quiz.',
  403: 'Only students can take quizzes.',
  404: 'This quiz is not available.',
  409: 'You have already completed this quiz.',
};

// Take Quiz page: starts or resumes an attempt, displays the server deadline,
// saves answers, and submits the attempt for automatic scoring.
export default function TakeQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const serverNow = useRef(Date.now);
  const submissionStarted = useRef(false);

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
          Object.fromEntries(
            res.data.attempt.answers.map((answer) => [
              answer.questionId,
              answer.selectedOption,
            ])
          )
        );
      })
      .catch((err) => {
        if (active) {
          setError(START_ERRORS[err.response?.status] || 'Could not start the quiz.');
        }
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  // The countdown is a display; the server enforces the actual deadline.
  useEffect(() => {
    if (!attempt) return undefined;

    const tick = () => {
      setTimeLeft(remainingMs(attempt.deadlineAt, serverNow.current()));
    };

    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [attempt]);

  async function choose(questionId, selectedOption) {
    if (timeLeft === 0 || isSubmitting || submissionStarted.current) return;

    setAnswers((previous) => ({
      ...previous,
      [questionId]: selectedOption,
    }));

    setSaveState('Saving...');
    setSubmitError('');

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

  async function handleSubmit() {
    if (isSubmitting || submissionStarted.current) return;

    const confirmed = window.confirm(
      'Are you sure you want to submit this quiz? You cannot change your answers after submission.'
    );

    if (!confirmed) return;

    submissionStarted.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await api.post(`/attempts/${attempt.id}/submit`);

      if (response.data.result?.status !== 'finalized') {
        throw new Error('The server has not finalized this attempt.');
      }

      navigate(`/attempts/${attempt.id}/result`, { replace: true });
    } catch (err) {
      submissionStarted.current = false;
      setIsSubmitting(false);

      if (err.response?.status === 401) {
        setSubmitError('Please log in again before submitting your quiz.');
      } else if (err.response?.status === 403) {
        setSubmitError('You are not allowed to submit this attempt.');
      } else if (err.response?.status === 404) {
        setSubmitError('This attempt could not be found.');
      } else if (err.response?.status === 409) {
        setSubmitError(
          'This attempt could not be submitted in its current state. Try opening the quiz again.'
        );
      } else {
        setSubmitError(
          err.message || 'Could not submit the quiz. Please try again.'
        );
      }
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
  const answeredCount = questions.filter(
    (item) => answers[item.id] !== undefined
  ).length;

  return (
    <main className="page">
      <h1>Take Quiz</h1>

      <p aria-live="polite">
        Time left:{' '}
        <strong>
          {timeLeft === null ? '--:--' : formatClock(timeLeft)}
        </strong>
      </p>

      <p>
        Question {current + 1} of {questions.length} | {answeredCount} answered
      </p>

      {timeUp && (
        <p role="alert">
          Time is up. Submit the quiz to view your result. Only answers saved
          before the deadline will be scored.
        </p>
      )}

      {question && (
        <fieldset disabled={timeUp || isSubmitting}>
          <legend>{question.prompt}</legend>

          {question.options.map((option, index) => (
            <label key={`${question.id}-${index}`} style={{ display: 'block' }}>
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
        <button
          type="button"
          onClick={() => setCurrent((index) => index - 1)}
          disabled={current === 0 || isSubmitting}
        >
          Previous
        </button>{' '}

        <button
          type="button"
          onClick={() => setCurrent((index) => index + 1)}
          disabled={current === questions.length - 1 || isSubmitting}
        >
          Next
        </button>
      </div>

      {saveState && <p role="status">{saveState}</p>}

      {submitError && <p role="alert">{submitError}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </main>
  );
}
