import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import QuizManagement from './QuizManagement.jsx';

function renderQuizManagement() {
  return render(
    <MemoryRouter initialEntries={['/manage/quizzes']}>
      <Routes>
        <Route path="/manage/quizzes" element={<QuizManagement />} />
        <Route path="/quizzes" element={<div>Quizzes Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OQS-09: Quiz Management page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state while fetching quizzes', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}));
    renderQuizManagement();

    expect(screen.getByRole('status')).toHaveTextContent('Loading managed quizzes...');
  });

  it('renders manageable quizzes for authorized staff', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        quizzes: [
          {
            id: 'q1',
            title: 'Data Structures Quiz',
            topic: 'Computer Science',
            status: 'draft',
            questionCount: 10,
          },
          {
            id: 'q2',
            title: 'Linear Algebra Quiz',
            topic: 'Mathematics',
            status: 'published',
            questionCount: 1,
          },
        ],
      },
    });

    renderQuizManagement();

    expect(await screen.findByText(/Data Structures Quiz/)).toBeInTheDocument();
    expect(screen.getByText(/10 questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 question/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/manage/quizzes');
  });

  it('shows empty message when no quizzes have been created', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { quizzes: [] },
    });

    renderQuizManagement();

    expect(await screen.findByText('No quizzes created yet.')).toBeInTheDocument();
  });

  it('denies access with 403 for student role', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      response: { status: 403, data: { error: 'Faculty or administrators only' } },
    });

    renderQuizManagement();

    expect(await screen.findByRole('alert')).toHaveTextContent('Faculty or administrators only');
    expect(screen.getByRole('link', { name: 'Back to quizzes' })).toHaveAttribute(
      'href',
      '/quizzes'
    );
  });

  it('prompts to log in when unauthenticated (401)', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      response: { status: 401 },
    });

    renderQuizManagement();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please log in as faculty or administrator to manage quizzes.'
    );
  });

  it('handles generic server errors', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Network Failure'));

    renderQuizManagement();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load quizzes for management.'
    );
  });

  it('cleans up without error when unmounted before request completes', () => {
    let resolvePromise;
    vi.spyOn(api, 'get').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { unmount } = renderQuizManagement();
    unmount();
    resolvePromise({ data: { quizzes: [] } });
  });
});
