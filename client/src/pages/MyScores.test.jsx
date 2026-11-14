import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import MyScores from './MyScores.jsx';

function renderMyScores() {
  return render(
    <MemoryRouter initialEntries={['/scores']}>
      <Routes>
        <Route path="/scores" element={<MyScores />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OQS-16: My Scores page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows loading state initially', () => {
    vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}));
    renderMyScores();

    expect(screen.getByRole('status')).toHaveTextContent('Loading scores...');
  });

  it('shows error state when API fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      response: { data: { error: 'Authentication required' } },
    });
    renderMyScores();

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required');
  });

  it('shows empty state when student has no completed attempts', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { scores: [] } });
    renderMyScores();

    expect(await screen.findByText('No completed attempts yet.')).toBeInTheDocument();
  });

  it('renders completed attempts with quiz title, score, and submission date', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        scores: [
          {
            quizTitle: 'JavaScript Basics',
            score: 5,
            submittedAt: '2026-11-10T12:00:00.000Z',
          },
        ],
      },
    });
    renderMyScores();

    expect(await screen.findByRole('heading', { name: 'My Scores' })).toBeInTheDocument();
    expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/me/scores');
  });
});
