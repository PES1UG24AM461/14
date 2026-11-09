import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import AdminFeedback from './AdminFeedback.jsx';

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/admin/feedback']}>
      <AdminFeedback />
    </MemoryRouter>
  );
}

describe('OQS-18: AdminFeedback page (FR-025, TC-ADM-01, TC-ADM-02)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('asks unauthenticated guests to log in', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: 'Feedback Review' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'log in' })).toHaveAttribute('href', '/login');
  });

  it('TC-ADM-02 rejects access for students with an Administrators only alert', () => {
    localStorage.setItem('token', 'student-token');
    localStorage.setItem('user', JSON.stringify({ id: 's1', role: 'student', name: 'Student' }));

    renderComponent();

    expect(screen.getByRole('alert')).toHaveTextContent('Administrators only');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('TC-ADM-02 rejects access for faculty with an Administrators only alert', () => {
    localStorage.setItem('token', 'faculty-token');
    localStorage.setItem('user', JSON.stringify({ id: 'f1', role: 'faculty', name: 'Faculty' }));

    renderComponent();

    expect(screen.getByRole('alert')).toHaveTextContent('Administrators only');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('TC-ADM-01 renders submitted feedback list for administrators', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        feedback: [
          {
            id: 'fb-1',
            userId: 's1',
            userName: 'Alice Student',
            userEmail: 'alice@example.com',
            userRole: 'student',
            rating: 5,
            message: 'Great quiz experience!',
            createdAt: '2026-11-08T12:00:00.000Z',
          },
          {
            id: 'fb-2',
            userId: 'f1',
            userName: 'Bob Faculty',
            userEmail: 'bob@example.com',
            userRole: 'faculty',
            rating: 4,
            message: 'Quiz editor is very intuitive.',
            createdAt: '2026-11-08T11:00:00.000Z',
          },
        ],
      },
    });

    renderComponent();

    expect(screen.getByRole('status')).toHaveTextContent('Loading feedback...');

    expect(await screen.findByText('Alice Student')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    expect(screen.getByText('Great quiz experience!')).toBeInTheDocument();

    expect(screen.getByText('Bob Faculty')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('Quiz editor is very intuitive.')).toBeInTheDocument();
  });

  it('displays empty state when no feedback is submitted yet', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    vi.spyOn(api, 'get').mockResolvedValue({
      data: { feedback: [] },
    });

    renderComponent();

    expect(await screen.findByText('No feedback submitted yet.')).toBeInTheDocument();
  });

  it('handles API 403 Forbidden response gracefully', async () => {
    localStorage.setItem('token', 'stale-admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    vi.spyOn(api, 'get').mockRejectedValue({
      response: { status: 403 },
    });

    renderComponent();

    expect(await screen.findByRole('alert')).toHaveTextContent('Administrators only');
  });

  it('handles general API errors gracefully', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    vi.spyOn(api, 'get').mockRejectedValue(new Error('Network error'));

    renderComponent();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load feedback. Please try again later.'
    );
  });

  it('TC-SEC-06 safely renders script tags as literal text content', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    const maliciousScript = '<script>alert(1)</script>';

    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        feedback: [
          {
            id: 'fb-xss',
            userId: 's1',
            userName: 'Attacker',
            userEmail: 'attacker@example.com',
            userRole: 'student',
            rating: 1,
            message: maliciousScript,
            createdAt: '2026-11-08T12:00:00.000Z',
          },
        ],
      },
    });

    renderComponent();

    const cell = await screen.findByText(maliciousScript);
    expect(cell).toBeInTheDocument();
    expect(cell.innerHTML).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
