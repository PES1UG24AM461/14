import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { clearAuth, getStoredToken, getStoredUser, isAdmin, isStaff } from '../utils/auth.js';

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
    <header className="site-header">
      <nav className="navbar" aria-label="Main">
        <div className="nav-links">
          <Link to="/" className="brand">
            Online Quiz System
          </Link>
          <Link to="/quizzes">Quizzes</Link>
          {isStaff(user) && <Link to="/manage/quizzes">Quiz Management</Link>}
          {isAdmin(user) && <Link to="/admin/users">User Management</Link>}
          {isAdmin(user) && <Link to="/admin/feedback">Feedback Review</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/feedback">Feedback</Link>
        </div>

        <div className="nav-links">
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
