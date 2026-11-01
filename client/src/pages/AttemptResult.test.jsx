import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import AttemptResult from './AttemptResult.jsx';

function renderAttemptResult(attemptId = 'a1') {
  return render(
    <MemoryRouter initialEntries={[`/attempts/${attemptId}/result`]}>
      <Routes>
        <Route path="/attempts/:attemptId/result" element={<AttemptResult />} />
        <Route path="/quizzes" element={<div>Quiz List Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OQS-12: AttemptResult page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows loading status before data resolves', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}));
    renderAttemptResult();

    expect(screen.getByRole('status')).toHaveTextContent('Loading result...');
  });

  it('TC-SCR-01 renders score, status, and formatted submission time on success', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        result: {
          attemptId: 'a1',
          quizId: 'q1',
          score: 8,
          status: 'finalized',
          submittedAt: '2026-10-29T10:00:00.000Z',
        },
      },
    });

    renderAttemptResult();

    expect(await screen.findByRole('heading', { name: 'Quiz Result' })).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/Status:\s*finalized/)).toBeInTheDocument();
    expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to quizzes' })).toHaveAttribute(
      'href',
      '/quizzes'
    );
    expect(api.get).toHaveBeenCalledWith('/attempts/a1/result');
  });

  it('renders dash when submittedAt is not provided', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        result: {
          attemptId: 'a1',
          score: 5,
          status: 'finalized',
          submittedAt: null,
        },
      },
    });

    renderAttemptResult();

    expect(await screen.findByRole('heading', { name: 'Quiz Result' })).toBeInTheDocument();
    expect(screen.getByText('Submitted: —')).toBeInTheDocument();
  });

  it('displays authentication error on 401 response', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 401 } });
    renderAttemptResult();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please log in to view this result.'
    );
    expect(screen.getByRole('link', { name: 'Back to quizzes' })).toHaveAttribute(
      'href',
      '/quizzes'
    );
  });

  it('displays generic error on other failures', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 500 } });
    renderAttemptResult();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this result.');
    expect(screen.getByRole('link', { name: 'Back to quizzes' })).toHaveAttribute(
      'href',
      '/quizzes'
    );
  });

  it('ignores response if component unmounts before request finishes', async () => {
    let resolvePromise;
    vi.spyOn(api, 'get').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { unmount } = renderAttemptResult();
    unmount();
    resolvePromise({ data: { result: { score: 10, status: 'finalized' } } });
  });
});
