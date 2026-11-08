export function getStoredToken() {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  try {
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    // Ignore storage errors
  }
}

export function isStaff(user) {
  return user?.role === 'faculty' || user?.role === 'administrator';
}

export function isAdmin(user) {
  return user?.role === 'administrator';
}
