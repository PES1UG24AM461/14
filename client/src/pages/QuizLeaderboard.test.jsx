import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import QuizLeaderboard from './QuizLeaderboard.jsx';

function renderBoard(quizId = 'q1') {
  return render(
    <MemoryRouter initialEntries={[`/quizzes/${quizId}/leaderboard`]}>
      <Routes>
        <Route path="/quizzes/:quizId/leaderboard" element={<QuizLeaderboard />} />
      </Routes>
    </MemoryRouter>
  );
}

const board = {
  quiz: { id: 'q1', title: 'JavaScript Basics', topic: 'Programming', questionCount: 5 },
  entries: [
    { rank: 1, name: 'Top', score: 5, submittedAt: '2026-11-01T10:20:00.000Z', isMe: false },
    { rank: 2, name: 'Earlier', score: 3, submittedAt: '2026-11-01T10:04:00.000Z', isMe: true },
    { rank: 3, name: 'Later', score: 3, submittedAt: '2026-11-01T10:09:00.000Z', isMe: false },
  ],
};

describe('OQS-17: Quiz Leaderboard page', () => {
  beforeEach(() => localStorage.setItem('token', 'student-token'));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('TC-LB-02 shows the entries in the order the server ranked them, with scores out of the total', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: board });
    renderBoard();

    expect(screen.getByRole('status')).toHaveTextContent('Loading leaderboard...');
    expect(
      await screen.findByRole('heading', { name: 'Leaderboard: JavaScript Basics' })
    ).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/quizzes/q1/leaderboard');

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      'Top',
      'Earlier (you)',
      'Later',
    ]);
    expect(within(rows[0]).getByText('5 / 5')).toBeInTheDocument();
  });

  it('TC-LB-03 highlights the viewer’s own row', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: board });
    renderBoard();

    const mine = (await screen.findByText('Earlier (you)')).closest('tr');
    expect(mine).toHaveAttribute('aria-current', 'true');
    expect(mine).toHaveClass('is-me');
  });

  it('shows an empty state when nobody has finished the quiz', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { ...board, entries: [] } });
    renderBoard();

    expect(await screen.findByText('No one has finished this quiz yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a not-available message for an unknown or draft quiz', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 404 } });
    renderBoard();

    expect(await screen.findByRole('alert')).toHaveTextContent('This quiz is not available.');
  });

  it('shows a generic error when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Network error'));
    renderBoard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the leaderboard.');
  });

  it('asks for login when the session has expired', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 401 } });
    renderBoard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Please log in');
  });

  it('asks guests to log in without calling the API', () => {
    localStorage.clear();
    const get = vi.spyOn(api, 'get');
    renderBoard();

    expect(screen.getByRole('link', { name: 'log in' })).toHaveAttribute('href', '/login');
    expect(get).not.toHaveBeenCalled();
  });
});
