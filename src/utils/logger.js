/**
 * Centralized logging utility with configurable log levels
 */

// Log levels in order of severity
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Current log level - can be configured at runtime
let currentLevel = LOG_LEVELS.WARN;

/**
 * Set the current log level
 * @param {string} level - 'ERROR', 'WARN', 'INFO', or 'DEBUG'
 */
export function setLogLevel(level) {
  const upperLevel = String(level).toUpperCase();
  if (upperLevel in LOG_LEVELS) {
    currentLevel = LOG_LEVELS[upperLevel];
  }
}

/**
 * Get the current log level as a string
 * @returns {string} Current log level name
 */
export function getLogLevel() {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLevel) || 'WARN';
}

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {...any} args - Additional arguments to log
 */
export function error(message, ...args) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    console.error(message, ...args);
  }
}

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {...any} args - Additional arguments to log
 */
export function warn(message, ...args) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    console.warn(message, ...args);
  }
}

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {...any} args - Additional arguments to log
 */
export function info(message, ...args) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    console.log(message, ...args);
  }
}

/**
 * Log a debug message
 * @param {string} message - Debug message
 * @param {...any} args - Additional arguments to log
 */
export function debug(message, ...args) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    console.log('[DEBUG]', message, ...args);
  }
}

export default {
  setLogLevel,
  getLogLevel,
  error,
  warn,
  info,
  debug,
};
