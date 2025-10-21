import {
  formatClock as formatClockDateFns,
  formatClockWithSeconds as formatClockWithSecondsDateFns,
  formatDateAndTime as formatDateAndTimeDateFns,
} from "../utils/dateUtils.js";

export function formatClock(date) {
  return formatClockDateFns(date);
}

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

export function formatClockWithSeconds(date) {
  return formatClockWithSecondsDateFns(date);
}

export function formatDateAndTime(date) {
  return formatDateAndTimeDateFns(date);
}

export default {
  formatClock,
  formatClockWithSeconds,
  formatDateAndTime,
  formatTime,
};
