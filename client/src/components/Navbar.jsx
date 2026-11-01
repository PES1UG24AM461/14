import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { clearAuth, getStoredToken, getStoredUser, isStaff } from '../utils/auth.js';

export default function Navbar() {
  const [user, setUser] = useState(getStoredUser);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    setUser(storedUser);

    if (token) {
      api
        .get('/roles/me')
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            clearAuth();
            setUser(null);
          }
        });
    }
  }, [location.pathname]);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout request failure, clear local state regardless
    } finally {
      clearAuth();
      setUser(null);
      navigate('/login');
    }
  }

  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', background: '#ffffff' }}>
      <nav
        className="page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1f2937' }}>
            Online Quiz System
          </Link>
          <Link to="/quizzes">Quizzes</Link>
          {isStaff(user) && <Link to="/manage/quizzes">Quiz Management</Link>}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {user ? (
            <>
              <span>
                {user.name} ({user.role})
              </span>
              <button type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
