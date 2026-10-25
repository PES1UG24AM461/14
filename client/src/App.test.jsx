import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('Client scaffold (OQS-01)', () => {
  it('renders the Home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Online Quiz System' })).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', () => {
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  });
});
