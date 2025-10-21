/**
 * Format time duration in seconds as MM:SS or HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return [hrs, mins, secs].map((part) => String(part).padStart(2, "0")).join(":");
  }
  return [mins, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

export default {
  formatTime,
};
