/**
 * Number utility functions for common validation and manipulation patterns
 */

/**
 * Check if a value is a valid finite number
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a finite number
 */
export function isValidNumber(value) {
  return Number.isFinite(value);
}

/**
 * Clamp a value between min and max bounds
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Ensure a value is positive (>= 0)
 * @param {number} value - Value to check
 * @returns {number} The value if positive, otherwise 0
 */
export function positive(value) {
  return Math.max(0, value);
}

/**
 * Ensure a value is a valid finite number, otherwise return a default
 * @param {*} value - Value to check
 * @param {number} defaultValue - Default value to return if invalid
 * @returns {number} The value if valid, otherwise the default
 */
export function withDefault(value, defaultValue) {
  return Number.isFinite(value) ? value : defaultValue;
}

/**
 * Check if a value is a valid finite number within a range
 * @param {*} value - Value to check
 * @param {number} min - Minimum bound (inclusive)
 * @param {number} max - Maximum bound (inclusive)
 * @returns {boolean} True if value is finite and within range
 */
export function isInRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Round a value to a specified number of decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
export function roundTo(value, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export default {
  isValidNumber,
  clamp,
  positive,
  withDefault,
  isInRange,
  roundTo,
};
