import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import { formatClock, remainingMs } from '../utils/countdown.js';
import TakeQuiz from './TakeQuiz.jsx';

const questions = [
  { id: 'q1', prompt: 'What is 2 + 2?', options: ['3', '4', '5'] },
  { id: 'q2', prompt: 'Which is a JavaScript keyword?', options: ['let', 'var2', 'def'] },
];

function startResponse(answers = [], secondsLeft = 600) {
  return {
    data: {
      attempt: {
        id: 'a1',
        quizId: 'quiz1',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        deadlineAt: new Date(Date.now() + secondsLeft * 1000).toISOString(),
        answers,
      },
      questions,
    },
  };
}

function renderTakeQuiz() {
  return render(
    <MemoryRouter initialEntries={['/quizzes/quiz1/take']}>
      <Routes>
        <Route path="/quizzes/:quizId/take" element={<TakeQuiz />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OQS-11: Take Quiz page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('TC-ATT-04 shows one question at a time with options, a countdown and navigation that keeps answers', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(startResponse());
    vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    renderTakeQuiz();

    expect(await screen.findByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText(/^(10:00|09:59)$/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/quizzes/quiz1/attempts');

    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Which is a JavaScript keyword?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByLabelText('4')).toBeChecked();
  });

  it('TC-ATT-05 saves each selected answer to the server immediately', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(startResponse());
    vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    renderTakeQuiz();

    fireEvent.click(await screen.findByLabelText('4'));

    expect(api.patch).toHaveBeenCalledWith('/attempts/a1/answers', {
      answers: [{ questionId: 'q1', selectedOption: 1 }],
    });
    expect(await screen.findByText('Answer saved')).toBeInTheDocument();
  });

  it('TC-ATT-14 restores saved answers when the attempt is resumed (e.g. after a refresh)', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(
      startResponse([{ questionId: 'q1', selectedOption: 2 }])
    );
    renderTakeQuiz();

    expect(await screen.findByLabelText('5')).toBeChecked();
    expect(screen.getByText(/1 answered/)).toBeInTheDocument();
  });

  it('TC-ATT-02 tells the student when the quiz was already completed', async () => {
    vi.spyOn(api, 'post').mockImplementation(() => Promise.reject({ response: { status: 409 } }));
    renderTakeQuiz();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You have already completed this quiz.'
    );
  });

  it('asks the student to log in when not authenticated', async () => {
    vi.spyOn(api, 'post').mockImplementation(() => Promise.reject({ response: { status: 401 } }));
    renderTakeQuiz();

    expect(await screen.findByRole('alert')).toHaveTextContent('Please log in');
  });

  it('shows when time is up and stops answers from being changed', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(startResponse([], 0));
    renderTakeQuiz();

    expect(await screen.findByText(/Time is up/)).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeDisabled();
  });
});

describe('countdown helpers', () => {
  it('formats remaining time as mm:ss and never goes below zero', () => {
    expect(formatClock(61000)).toBe('01:01');
    expect(formatClock(0)).toBe('00:00');
    expect(remainingMs(new Date(Date.now() - 5000))).toBe(0);
  });
});
