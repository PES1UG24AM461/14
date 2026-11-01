import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import Login from './Login.jsx';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/quizzes" element={<div>Quizzes Page</div>} />
        <Route path="/register" element={<div>Register Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function fillAndSubmit(email = 'student@example.com', password = 'Password123') {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
}

describe('OQS-05: Login page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders login form with inputs and links', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create a student account' })).toHaveAttribute(
      'href',
      '/register'
    );
  });

  it('logs in successfully, saves JWT to localStorage, and navigates to quizzes', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        message: 'Login successful',
        token: 'test-jwt-token-xyz',
        user: { id: 'u1', name: 'Asha Rao', email: 'student@example.com', role: 'student' },
      },
    });

    renderLogin();
    fillAndSubmit('  student@example.com ', 'Password123');

    expect(await screen.findByText('Quizzes Page')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'student@example.com',
      password: 'Password123',
    });
    expect(localStorage.getItem('token')).toBe('test-jwt-token-xyz');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      id: 'u1',
      name: 'Asha Rao',
      email: 'student@example.com',
      role: 'student',
    });
  });

  it('displays error message for invalid credentials (401)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 401, data: { error: 'Invalid email or password' } },
    });

    renderLogin();
    fillAndSubmit('wrong@example.com', 'BadPass');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('falls back to default 401 error text when response data has no error string', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 401 },
    });

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('displays error message for missing fields (400)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 400, data: { error: 'Email and password are required' } },
    });

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Email and password are required');
  });

  it('falls back to default 400 error text when response data has no error string', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 400 },
    });

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Email and password are required');
  });

  it('displays network failure message when server is unreachable', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('Network Error'));

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to connect to the server. Please try again.'
    );
  });
});
