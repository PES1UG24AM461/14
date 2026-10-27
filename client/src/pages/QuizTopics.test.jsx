import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import QuizDetail from './QuizDetail.jsx';
import QuizTopics from './QuizTopics.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/quizzes" element={<QuizTopics />} />
        <Route path="/quizzes/:quizId" element={<QuizDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OQS-10: Quiz Topics and quiz details pages', () => {
  // Spy on the real Axios instance; a vi.mock factory makes Vitest 5 report handled rejections as failures.
  afterEach(() => vi.restoreAllMocks());

  it('TC-NAV-01 shows published quizzes grouped under their topics', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        topics: [
          {
            topic: 'Programming',
            quizzes: [
              { id: 'q1', title: 'JavaScript Basics', durationSeconds: 600, questionCount: 5 },
            ],
          },
        ],
      },
    });
    renderAt('/quizzes');

    expect(await screen.findByRole('heading', { name: 'Programming' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JavaScript Basics' })).toHaveAttribute(
      'href',
      '/quizzes/q1'
    );
    expect(screen.getByText(/5 questions, 10 minutes/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/quizzes');
  });

  it('shows a message when no quizzes are published', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { topics: [] } });
    renderAt('/quizzes');

    expect(await screen.findByText('No quizzes are available yet.')).toBeInTheDocument();
  });

  it('shows an error when quizzes cannot be loaded', async () => {
    vi.spyOn(api, 'get').mockImplementation(() => Promise.reject(new Error('network')));
    renderAt('/quizzes');

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load quizzes');
  });

  it('TC-NAV-03 shows title, topic, duration and question count on the details page', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        quiz: {
          id: 'q1',
          title: 'JavaScript Basics',
          topic: 'Programming',
          durationSeconds: 600,
          questionCount: 5,
        },
      },
    });
    renderAt('/quizzes/q1');

    expect(await screen.findByRole('heading', { name: 'JavaScript Basics' })).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('10 minutes')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/quizzes/q1');
  });

  it('TC-NAV-02 shows "not available" for a quiz that is a draft or does not exist', async () => {
    vi.spyOn(api, 'get').mockImplementation(() => Promise.reject({ response: { status: 404 } }));
    renderAt('/quizzes/draft-id');

    expect(await screen.findByRole('alert')).toHaveTextContent('This quiz is not available.');
  });
});
