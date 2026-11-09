import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import App from '../App.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('OQS-13: site pages and navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, 'get').mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('TC-NAV-04 reaches Home, About, Contact and Feedback from the navigation bar', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });

    for (const [link, heading] of [
      ['About', 'About'],
      ['Contact', 'Contact'],
      ['Feedback', 'Feedback'],
      ['Online Quiz System', 'Online Quiz System'],
    ]) {
      fireEvent.click(within(nav).getByRole('link', { name: link }));
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    }
  });

  it('TC-NAV-05 lets the navigation wrap instead of scrolling sideways on narrow screens', () => {
    renderAt('/');

    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass('navbar');
  });

  it('Contact links to the Feedback page and the project issues', () => {
    renderAt('/contact');

    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: 'Feedback' })).toHaveAttribute(
      'href',
      '/feedback'
    );
    expect(screen.getByRole('link', { name: 'project repository' })).toHaveAttribute(
      'href',
      'https://github.com/PES1UG24AM461/14/issues'
    );
  });
});

describe('OQS-13: Feedback page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function renderLoggedIn() {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('user', JSON.stringify({ name: 'Asha', role: 'student' }));
    vi.spyOn(api, 'get').mockResolvedValue({ data: { user: { name: 'Asha', role: 'student' } } });
    renderAt('/feedback');
  }

  const send = (message) => {
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  };

  it('asks guests to log in before sending feedback', () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: {} });
    renderAt('/feedback');

    expect(screen.getByRole('link', { name: 'log in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });

  it('sends a rating and message and thanks the user', async () => {
    renderLoggedIn();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });

    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '4' } });
    send('  Great quizzes  ');

    expect(await screen.findByRole('status')).toHaveTextContent('Thank you for your feedback.');
    expect(post).toHaveBeenCalledWith('/feedback', { rating: 4, message: 'Great quizzes' });
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });

  it('TC-FB-01 accepts a rating without a message, or a message without a rating', async () => {
    renderLoggedIn();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });

    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '3' } });
    send('');
    await screen.findByRole('status');
    expect(post).toHaveBeenLastCalledWith('/feedback', { rating: 3 });

    send('Just a message');
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post).toHaveBeenLastCalledWith('/feedback', { message: 'Just a message' });
  });

  it('TC-FB-02 TC-UX-02 asks for a rating or a message when both are empty', () => {
    renderLoggedIn();
    const post = vi.spyOn(api, 'post');

    send('   ');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please choose a rating or write a message.'
    );
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { status: 401 } }, 'log in again'],
    [{ response: { status: 404 } }, 'cannot be sent yet'],
    [{ response: { status: 422, data: { error: 'Message is too long' } } }, 'Message is too long'],
    [new Error('Network Error'), 'Could not send your feedback'],
  ])('shows a clear message when sending fails (%#)', async (failure, text) => {
    renderLoggedIn();
    vi.spyOn(api, 'post').mockRejectedValue(failure);

    send('Hello');

    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });
});
