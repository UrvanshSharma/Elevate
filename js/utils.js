/**
 * Elevate Utilities Module
 * Contains pure helper functions for sanitization, formatting, validation, and string utilities.
 * Compatible with both browser globals and CommonJS for testing.
 */
(function(root) {
  "use strict";

  /**
   * Escape HTML entities to prevent cross-site scripting (XSS).
   * @param {string} str - Raw string to escape.
   * @returns {string} Sanitized string safe for HTML injection.
   */
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Format CGPA to 1 decimal place.
   * @param {number|string} value - Numerical or string CGPA.
   * @returns {string} Formatted CGPA string.
   */
  function formatCgpa(value) {
    const num = Number(value);
    if (isNaN(num)) return "0.0";
    return num.toFixed(1);
  }

  /**
   * Validate email format with standard pattern.
   * @param {string} email - Email address to validate.
   * @returns {boolean} True if valid email.
   */
  function isValidEmail(email) {
    if (typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate password complexity:
   * Minimum 8 characters, at least 1 uppercase letter, 1 number, and 1 special character.
   * @param {string} password - Password string to validate.
   * @returns {boolean} True if password meets complexity requirements.
   */
  function isValidPassword(password) {
    if (typeof password !== "string") return false;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Extract 1 or 2 uppercase initials from a user's name.
   * @param {string} name - User's full name.
   * @returns {string} Initials (e.g. "AS" or "ST").
   */
  function getUserInitials(name) {
    const safeName = (name || "").trim();
    if (!safeName) return "ST";

    const nameParts = safeName.split(/\s+/).filter(Boolean);
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    if (nameParts.length === 1 && nameParts[0].length >= 1) {
      return nameParts[0].slice(0, 2).toUpperCase();
    }
    return "ST";
  }

  /**
   * Safe document.getElementById wrapper.
   * @param {string} id - Element ID.
   * @returns {HTMLElement|null}
   */
  function byId(id) {
    if (typeof document === "undefined") return null;
    return document.getElementById(id);
  }

  const ElevateUtils = Object.freeze({
    escapeHtml: escapeHtml,
    formatCgpa: formatCgpa,
    isValidEmail: isValidEmail,
    isValidPassword: isValidPassword,
    getUserInitials: getUserInitials,
    byId: byId
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateUtils;
  } else {
    root.ElevateUtils = ElevateUtils;
  }
})(typeof window !== "undefined" ? window : globalThis);
