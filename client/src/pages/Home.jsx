import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredUser, isStaff } from '../utils/auth.js';

export default function Home() {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <main className="page">
      <h1>Online Quiz System</h1>
      <p>Browse quizzes by topic, attempt them once under a timer and see your score instantly.</p>
      <p>
        <Link to="/quizzes">Browse quizzes</Link>
      </p>
      {isStaff(user) && (
        <p>
          <Link to="/manage/quizzes">Quiz Management</Link>
        </p>
      )}
      {!user && (
        <>
          <p>
            <Link to="/register">Create a student account</Link>
          </p>
          <p>
            <Link to="/login">Log in</Link>
          </p>
        </>
      )}
    </main>
  );
}
