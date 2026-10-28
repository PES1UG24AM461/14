import { afterEach, describe, expect, it } from 'vitest';
import api from './client.js';

// Runs the request interceptors the same way Axios does before sending a request.
function intercept(config) {
  return api.interceptors.request.handlers.reduce(
    (current, handler) => handler.fulfilled(current),
    config
  );
}

describe('API client', () => {
  afterEach(() => localStorage.clear());

  it('attaches the stored token as a Bearer header', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    expect(intercept({ headers: {} }).headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('sends no Authorization header when nobody is logged in', () => {
    expect(intercept({ headers: {} }).headers.Authorization).toBeUndefined();
  });
});
