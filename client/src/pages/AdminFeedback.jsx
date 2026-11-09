import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getStoredToken, getStoredUser, isAdmin } from '../utils/auth.js';

// Administrator Feedback Review page (FR-025, TC-ADM-01, TC-ADM-02).
export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      .get('/admin/feedback')
      .then((res) => {
        if (!active) return;
        setFeedback(res.data?.feedback || []);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoading(false);
        if (err.response?.status === 401) {
          setError('Please log in as an administrator to view feedback.');
        } else if (err.response?.status === 403) {
          setError('Administrators only');
        } else {
          setError(err.response?.data?.error || 'Could not load feedback. Please try again later.');
        }
      });

    return () => {
      active = false;
    };
  }, [token, isAdministrator]);

  if (!token) {
    return (
      <main className="page">
        <h1>Feedback Review</h1>
        <p>
          Please <Link to="/login">log in</Link> as an administrator to view feedback.
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Feedback Review</h1>
      <p>Review feedback and ratings submitted by users.</p>

      {loading && <p role="status">Loading feedback...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && feedback.length === 0 && <p>No feedback submitted yet.</p>}

      {!loading && !error && feedback.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            className="feedback-table"
            style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px' }}>User</th>
                <th style={{ padding: '8px' }}>Role</th>
                <th style={{ padding: '8px' }}>Rating</th>
                <th style={{ padding: '8px' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <strong>{item.userName}</strong>
                    <br />
                    <small>{item.userEmail}</small>
                  </td>
                  <td style={{ padding: '8px' }}>{item.userRole}</td>
                  <td style={{ padding: '8px' }}>
                    {item.rating != null ? `${item.rating} / 5` : '—'}
                  </td>
                  <td style={{ padding: '8px' }}>{item.message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
