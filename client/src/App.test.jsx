import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api/client.js';
import App from './App.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('Client scaffold (OQS-01)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, 'get').mockResolvedValue({ data: { user: null, quizzes: [] } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders the Home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Online Quiz System' })).toBeInTheDocument();
  });

  it('renders the Login page at /login', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });

  it('renders the Quiz Management page at /manage/quizzes', () => {
    renderAt('/manage/quizzes');
    expect(screen.getByRole('heading', { name: 'Quiz Management' })).toBeInTheDocument();
  });

  it('renders the Feedback Review page at /admin/feedback', () => {
    localStorage.setItem('token', 'token-admin');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', name: 'Admin', role: 'administrator' })
    );
    renderAt('/admin/feedback');
    expect(screen.getByRole('heading', { name: 'Feedback Review' })).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', () => {
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  });
});
