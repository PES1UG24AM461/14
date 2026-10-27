// Milliseconds left until the server deadline, never negative.
export function remainingMs(deadlineAt, now = Date.now()) {
  return Math.max(0, new Date(deadlineAt).getTime() - now);
}

// 61000 -> "01:01"
export function formatClock(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
