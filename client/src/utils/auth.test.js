import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAuth, getStoredToken, getStoredUser, isAdmin, isStaff, setAuth } from './auth.js';

describe('auth utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves token and user correctly', () => {
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();

    setAuth('sample-jwt-token', { id: 'u1', role: 'student', name: 'Student' });

    expect(getStoredToken()).toBe('sample-jwt-token');
    expect(getStoredUser()).toEqual({ id: 'u1', role: 'student', name: 'Student' });
  });

  it('clears stored credentials', () => {
    setAuth('sample-jwt-token', { id: 'u1', role: 'student' });
    clearAuth();

    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('determines staff roles correctly', () => {
    expect(isStaff(null)).toBe(false);
    expect(isStaff({ role: 'student' })).toBe(false);
    expect(isStaff({ role: 'faculty' })).toBe(true);
    expect(isStaff({ role: 'administrator' })).toBe(true);
  });

  it('determines administrator role correctly', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({ role: 'student' })).toBe(false);
    expect(isAdmin({ role: 'faculty' })).toBe(false);
    expect(isAdmin({ role: 'administrator' })).toBe(true);
  });

  it('handles invalid JSON in localStorage safely', () => {
    localStorage.setItem('user', 'invalid-json{');
    expect(getStoredUser()).toBeNull();
  });
});
