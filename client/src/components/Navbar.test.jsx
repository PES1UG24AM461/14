import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import Navbar from './Navbar.jsx';

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar role-based navigation visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, 'get').mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders guest navigation when not logged in', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Online Quiz System' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Quizzes' })).toHaveAttribute('href', '/quizzes');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: 'Quiz Management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Feedback Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('students do NOT see the Quiz Management option', () => {
    localStorage.setItem('token', 'token-student');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 's1', name: 'Student One', role: 'student' })
    );

    renderNavbar();

    expect(screen.getByText('Student One (student)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quiz Management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Feedback Review' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('faculty see the Quiz Management option', () => {
    localStorage.setItem('token', 'token-faculty');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'f1', name: 'Prof. Sharma', role: 'faculty' })
    );

    renderNavbar();

    expect(screen.getByText('Prof. Sharma (faculty)')).toBeInTheDocument();
    const manageLink = screen.getByRole('link', { name: 'Quiz Management' });
    expect(manageLink).toBeInTheDocument();
    expect(manageLink).toHaveAttribute('href', '/manage/quizzes');
    expect(screen.queryByRole('link', { name: 'Feedback Review' })).not.toBeInTheDocument();
  });

  it('administrators see the Quiz Management and Feedback Review options', () => {
    localStorage.setItem('token', 'token-admin');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', name: 'Admin User', role: 'administrator' })
    );

    renderNavbar();

    expect(screen.getByText('Admin User (administrator)')).toBeInTheDocument();
    const manageLink = screen.getByRole('link', { name: 'Quiz Management' });
    expect(manageLink).toBeInTheDocument();
    expect(manageLink).toHaveAttribute('href', '/manage/quizzes');

    const feedbackLink = screen.getByRole('link', { name: 'Feedback Review' });
    expect(feedbackLink).toBeInTheDocument();
    expect(feedbackLink).toHaveAttribute('href', '/admin/feedback');
  });

  it('syncs user role from GET /roles/me when token is present', async () => {
    localStorage.setItem('token', 'valid-token');
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { user: { id: 'f2', name: 'Dr. Kumar', role: 'faculty' } },
    });

    renderNavbar();

    expect(await screen.findByRole('link', { name: 'Quiz Management' })).toBeInTheDocument();
    expect(screen.getByText('Dr. Kumar (faculty)')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/roles/me');
  });

  it('clears session if GET /roles/me returns 401', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ id: 's1', role: 'student' }));

    vi.spyOn(api, 'get').mockRejectedValue({
      response: { status: 401 },
    });

    renderNavbar();

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logs out user and updates navigation', async () => {
    localStorage.setItem('token', 'token-faculty');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'f1', name: 'Prof. Sharma', role: 'faculty' })
    );
    vi.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Logout successful' } });

    renderNavbar();

    const logoutBtn = screen.getByRole('button', { name: 'Log out' });
    fireEvent.click(logoutBtn);

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
