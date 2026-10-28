// Milliseconds left until the server deadline, never negative.
export function remainingMs(deadlineAt, now = Date.now()) {
  return Math.max(0, new Date(deadlineAt).getTime() - now);
}

// Estimated server time: the serverTime sent with the attempt plus the time elapsed since, measured with
// a monotonic clock. Changing the computer's clock therefore cannot change the countdown (NFR-003).
export function createServerClock(serverTime, monotonicNow = () => performance.now()) {
  const base = serverTime ? new Date(serverTime).getTime() : Date.now();
  const receivedAt = monotonicNow();
  return () => base + (monotonicNow() - receivedAt);
}

// 61000 -> "01:01"
export function formatClock(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
