import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getStoredToken } from '../utils/auth.js';

const MAX_MESSAGE = 1000;

// Feedback page (FR-007). Feedback is stored by POST /api/feedback (OQS-18, FR-024).
export default function Feedback() {
  const [rating, setRating] = useState('5');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!getStoredToken()) {
    return (
      <main className="page">
        <h1>Feedback</h1>
        <p>
          Please <Link to="/login">log in</Link> to send feedback.
        </p>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setError('');
    if (!message.trim()) {
      setError('Please write a message.');
      return;
    }
    setSending(true);
    try {
      await api.post('/feedback', { rating: Number(rating), message: message.trim() });
      setStatus('Thank you for your feedback.');
      setMessage('');
      setRating('5');
    } catch (err) {
      if (err.response?.status === 401) setError('Please log in again to send feedback.');
      else if (err.response?.status === 404)
        setError('Feedback cannot be sent yet. Please try later.');
      else setError(err.response?.data?.error || 'Could not send your feedback. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page">
      <h1>Feedback</h1>
      <p>Tell us what works and what could be better.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="feedback-rating">Rating</label>
          <select
            id="feedback-rating"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} - {['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'][n - 1]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="feedback-message">Message</label>
          <textarea
            id="feedback-message"
            rows={5}
            maxLength={MAX_MESSAGE}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <button type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send feedback'}
        </button>
      </form>

      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
