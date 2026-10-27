
import { describe, it, expect, vi } from 'vitest';
import { authorize } from '../src/middleware/authorize.js';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('authorize middleware', () => {
  it('returns 401 when no authenticated user exists', () => {
    const req = {};
    const res = createResponse();
    const next = vi.fn();

    authorize('administrator')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the user role is not allowed', () => {
    const req = { user: { role: 'student' } };
    const res = createResponse();
    const next = vi.fn();

    authorize('administrator')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a user with an allowed role', () => {
    const req = { user: { role: 'faculty' } };
    const res = createResponse();
    const next = vi.fn();

    authorize('faculty', 'administrator')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an invalid allowed role', () => {
    expect(() => authorize('superuser')).toThrow(
      'Invalid or missing allowed roles'
    );
  });

  it('rejects an empty list of allowed roles', () => {
    expect(() => authorize()).toThrow('Invalid or missing allowed roles');
  });
});
