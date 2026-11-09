import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import UserManagement from './UserManagement.jsx';

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <UserManagement />
    </MemoryRouter>
  );
}

describe('OQS-19: UserManagement page (FR-026, TC-ADM-03, TC-ADM-04)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('asks unauthenticated guests to log in as an administrator', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: 'User Management' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'log in' })).toHaveAttribute('href', '/login');
  });

  it('TC-ADM-04 rejects access for students with an Administrators only alert', () => {
    localStorage.setItem('token', 'student-token');
    localStorage.setItem('user', JSON.stringify({ id: 's1', role: 'student', name: 'Student' }));

    renderComponent();

    expect(screen.getByRole('alert')).toHaveTextContent('Administrators only');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('TC-ADM-04 rejects access for faculty with an Administrators only alert', () => {
    localStorage.setItem('token', 'faculty-token');
    localStorage.setItem('user', JSON.stringify({ id: 'f1', role: 'faculty', name: 'Faculty' }));

    renderComponent();

    expect(screen.getByRole('alert')).toHaveTextContent('Administrators only');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('TC-ADM-03 renders user list and allows administrator to change user role', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    const mockUsers = [
      {
        id: 'u1',
        name: 'Alice Student',
        email: 'alice@example.com',
        role: 'student',
        createdAt: '2026-10-20T10:00:00.000Z',
      },
      {
        id: 'u2',
        name: 'Bob Faculty',
        email: 'bob@example.com',
        role: 'faculty',
        createdAt: '2026-10-21T10:00:00.000Z',
      },
    ];

    vi.spyOn(api, 'get').mockResolvedValue({ data: { users: mockUsers } });
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: {
        user: { ...mockUsers[0], role: 'faculty' },
      },
    });

    renderComponent();

    expect(screen.getByRole('status')).toHaveTextContent('Loading users...');

    expect(await screen.findByText('Alice Student')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Faculty')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();

    // Find the select for Alice Student and change role to faculty
    const aliceSelect = screen.getByLabelText('Role for Alice Student');
    expect(aliceSelect).toHaveValue('student');

    fireEvent.change(aliceSelect, { target: { value: 'faculty' } });

    expect(patchSpy).toHaveBeenCalledWith('/admin/users/u1/role', { role: 'faculty' });

    expect(
      await screen.findByText('Role for Alice Student updated to faculty.')
    ).toBeInTheDocument();
  });

  it('displays empty state when no users are found', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    vi.spyOn(api, 'get').mockResolvedValue({ data: { users: [] } });

    renderComponent();

    expect(await screen.findByText('No users found.')).toBeInTheDocument();
  });

  it('handles API loading failure gracefully', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    vi.spyOn(api, 'get').mockRejectedValue({
      response: { data: { error: 'Database error' } },
    });

    renderComponent();

    expect(await screen.findByRole('alert')).toHaveTextContent('Database error');
  });

  it('handles role update failure gracefully', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'a1', role: 'administrator', name: 'Admin' })
    );

    const mockUsers = [
      {
        id: 'u1',
        name: 'Alice Student',
        email: 'alice@example.com',
        role: 'student',
        createdAt: '2026-10-20T10:00:00.000Z',
      },
    ];

    vi.spyOn(api, 'get').mockResolvedValue({ data: { users: mockUsers } });
    vi.spyOn(api, 'patch').mockRejectedValue({
      response: { data: { error: 'Failed to update role' } },
    });

    renderComponent();

    const aliceSelect = await screen.findByLabelText('Role for Alice Student');
    fireEvent.change(aliceSelect, { target: { value: 'faculty' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update role');
  });
});
