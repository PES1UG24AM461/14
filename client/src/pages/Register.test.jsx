import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Register from './Register.jsx';

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'asha@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SecurePass123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
}

function respond(ok, body) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, json: async () => body });
}

describe('OQS-04: Registration page', () => {
  afterEach(() => vi.restoreAllMocks());

  it('TC-AUTH-01 shows a success message and clears the form after registering', async () => {
    const fetchSpy = respond(true, { user: { id: 'u1' } });
    render(<Register />);
    fillAndSubmit();

    expect(await screen.findByRole('status')).toHaveTextContent('Registration successful');
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/register', expect.any(Object));
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'SecurePass123',
    });
    expect(screen.getByLabelText('Full name')).toHaveValue('');
  });

  it('TC-AUTH-02 shows the server error for a duplicate email', async () => {
    respond(false, { error: 'Email is already registered' });
    render(<Register />);
    fillAndSubmit();

    expect(await screen.findByRole('status')).toHaveTextContent('Email is already registered');
    expect(screen.getByLabelText('Email address')).toHaveValue('asha@example.com');
  });

  it('TC-AUTH-03 labels every field and enforces the input limits in the form', () => {
    render(<Register />);

    expect(screen.getByLabelText('Full name')).toBeRequired();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('minLength', '8');
  });

  it('falls back to a generic message when the server gives no error text', async () => {
    respond(false, {});
    render(<Register />);
    fillAndSubmit();

    expect(await screen.findByRole('status')).toHaveTextContent('Registration failed.');
  });

  it('shows a connection message when the server cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Register />);
    fillAndSubmit();

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to connect');
  });
});
