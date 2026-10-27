// "600" seconds -> "10 minutes"; used wherever a quiz duration is shown.
export function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}
