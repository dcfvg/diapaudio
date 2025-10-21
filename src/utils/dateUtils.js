/**
 * Centralized date utilities using date-fns
 * Provides consistent date/time operations across the application
 */

import { format, getTime, isValid, getYear, getMonth, getDate, getHours, getMinutes, getSeconds, getMilliseconds } from 'date-fns';

/**
 * Get timestamp in milliseconds from a Date
 * @param {Date|number} date - Date object or timestamp
 * @returns {number} - Timestamp in milliseconds
 */
export function toTimestamp(date) {
  if (typeof date === 'number') {
    return date;
  }
  if (date instanceof Date) {
    return getTime(date);
  }
  return NaN;
}

/**
 * Check if a date is valid
 * @param {Date} date - Date to validate
 * @returns {boolean}
 */
export function isValidDate(date) {
  return date instanceof Date && isValid(date);
}

/**
 * Format a date as HH:MM
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string
 */
export function formatClock(date) {
  if (!isValidDate(date)) {
    return '00:00';
  }
  return format(date, 'HH:mm');
}

/**
 * Format a date as HH:MM:SS
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string
 */
export function formatClockWithSeconds(date) {
  if (!isValidDate(date)) {
    return '00:00:00';
  }
  return format(date, 'HH:mm:ss');
}

/**
 * Format a date as DD/MM/YYYY — HH:MM:SS
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date and time string
 */
export function formatDateAndTime(date) {
  if (!isValidDate(date)) {
    return 'Invalid Date';
  }
  return format(date, 'dd/MM/yyyy — HH:mm:ss');
}

/**
 * Format date for filename (YYYYMMDD_HHMMSS)
 * @param {Date} date - Date to format
 * @returns {string} - Formatted filename-safe string
 */
export function formatTimestampForFilename(date) {
  if (!isValidDate(date)) {
    return 'unknown';
  }
  return format(date, 'yyyyMMdd_HHmmss');
}

/**
 * Format date for locale display
 * @param {Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export function formatLocaleDate(date, options = {}) {
  if (!isValidDate(date)) {
    return '';
  }
  return date.toLocaleDateString(undefined, options);
}

/**
 * Create a Date from components
 * @param {number} year
 * @param {number} month - 1-indexed (1 = January)
 * @param {number} day
 * @param {number} hours
 * @param {number} minutes
 * @param {number} seconds
 * @param {number} milliseconds
 * @returns {Date|null}
 */
export function createDate(year, month, day, hours = 0, minutes = 0, seconds = 0, milliseconds = 0) {
  // Convert 2-digit year to 4-digit
  let fullYear = year;
  if (year < 100) {
    fullYear = year < 50 ? 2000 + year : 1900 + year;
  }

  // Validate ranges
  if (
    !Number.isInteger(fullYear) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    fullYear < 1900 ||
    fullYear > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours >= 24 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return null;
  }

  const date = new Date(fullYear, month - 1, day, hours, minutes, seconds, milliseconds);
  return isValid(date) ? date : null;
}

/**
 * Parse an ISO 8601 date string or similar formats
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null}
 */
export function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const trimmed = dateStr.trim();

  // Try ISO 8601 formats with time
  let match = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match.map(Number);
    return createDate(year, month, day, hours, minutes, seconds);
  }

  // Try date only: YYYY-MM-DD
  match = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (match) {
    const [, year, month, day] = match.map(Number);
    return createDate(year, month, day);
  }

  // Try year only: YYYY
  match = trimmed.match(/^(\d{4})$/);
  if (match) {
    const year = Number(match[1]);
    if (year >= 1900 && year <= 2100) {
      return createDate(year, 1, 1);
    }
  }

  return null;
}

/**
 * Parse EXIF datetime string (format: "YYYY:MM:DD HH:MM:SS")
 * @param {string} dateTimeStr - EXIF datetime string
 * @returns {Date|null}
 */
export function parseEXIFDateTime(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') {
    return null;
  }

  const match = dateTimeStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes, seconds] = match.map(Number);
  return createDate(year, month, day, hours, minutes, seconds);
}

/**
 * Get date component values (useful for analog clock calculations)
 * @param {Date} date
 * @returns {Object} - Object with hours, minutes, seconds, milliseconds
 */
export function getDateComponents(date) {
  if (!isValidDate(date)) {
    return { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
  }
  
  return {
    year: getYear(date),
    month: getMonth(date) + 1, // date-fns returns 0-indexed month
    day: getDate(date),
    hours: getHours(date),
    minutes: getMinutes(date),
    seconds: getSeconds(date),
    milliseconds: getMilliseconds(date),
  };
}

/**
 * Calculate analog clock angles for a given date
 * @param {Date} date
 * @returns {Object} - Object with hour, minute, second angles in degrees
 */
export function calculateClockAngles(date) {
  if (!isValidDate(date)) {
    return { hour: 0, minute: 0, second: 0 };
  }

  const components = getDateComponents(date);
  const seconds = components.seconds + components.milliseconds / 1000;
  const minutes = components.minutes + seconds / 60;
  const hours = (components.hours % 12) + minutes / 60;

  return {
    hour: hours * 30,    // 360° / 12 hours = 30° per hour
    minute: minutes * 6,  // 360° / 60 minutes = 6° per minute
    second: seconds * 6,  // 360° / 60 seconds = 6° per second
  };
}

export default {
  toTimestamp,
  isValidDate,
  formatClock,
  formatClockWithSeconds,
  formatDateAndTime,
  formatTimestampForFilename,
  formatLocaleDate,
  createDate,
  parseDateString,
  parseEXIFDateTime,
  getDateComponents,
  calculateClockAngles,
};
