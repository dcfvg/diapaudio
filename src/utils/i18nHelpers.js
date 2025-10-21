/**
 * Helper function to safely call translation function
 * Falls back to the key itself if translation function is not available
 * @param {Function} t - Translation function (i18next t function)
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Translated string or key
 */
export function translate(t, key, params) {
  if (typeof t === "function") {
    return t(key, params);
  }
  return key;
}

export default translate;
