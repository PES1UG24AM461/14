import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getStoredToken, getStoredUser, isAdmin } from '../utils/auth.js';

const ROLES = ['student', 'faculty', 'administrator'];

// User Management page for administrators (FR-026, TC-ADM-03, TC-ADM-04).
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const token = getStoredToken();
  const user = getStoredUser();
  const isAdministrator = isAdmin(user);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (!isAdministrator) {
      setLoading(false);
      setError('Administrators only');
      return;
    }

    let active = true;

    api
      .get('/admin/users')
      .then((res) => {
        if (!active) return;
        setUsers(res.data?.users || []);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoading(false);
        if (err.response?.status === 401) {
          setError('Please log in as an administrator to manage users.');
        } else if (err.response?.status === 403) {
          setError('Administrators only');
        } else {
          setError(err.response?.data?.error || 'Could not load users. Please try again later.');
        }
      });

    return () => {
      active = false;
    };
  }, [token, isAdministrator]);

  async function handleRoleChange(userId, targetName, newRole) {
    setError('');
    setSuccessMessage('');
    setUpdatingId(userId);

    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      const updated = res.data?.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated?.role || newRole } : u))
      );
      setSuccessMessage(`Role for ${targetName} updated to ${newRole}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update user role. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (!token) {
    return (
      <main className="page">
        <h1>User Management</h1>
        <p>
          Please <Link to="/login">log in</Link> as an administrator to manage users.
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>User Management</h1>
      <p>Manage user roles and permissions across the platform.</p>

      {loading && <p role="status">Loading users...</p>}
      {error && <p role="alert">{error}</p>}
      {successMessage && <p role="status">{successMessage}</p>}

      {!loading && !error && users.length === 0 && <p>No users found.</p>}

      {!loading && !error && users.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            className="user-table"
            style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Current Role</th>
                <th style={{ padding: '8px' }}>Joined</th>
                <th style={{ padding: '8px' }}>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px' }}>
                    <strong>{u.name}</strong>
                  </td>
                  <td style={{ padding: '8px' }}>{u.email}</td>
                  <td style={{ padding: '8px' }}>
                    <span className="role-badge">{u.role}</span>
                  </td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, u.name, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
