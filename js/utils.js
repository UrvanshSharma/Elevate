// Utility helpers for HTML escaping, formatting, and validation
(function(root) {
  "use strict";

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Format CGPA to 1 decimal place
  function formatCgpa(value) {
    const num = Number(value);
    if (isNaN(num)) return "0.0";
    return num.toFixed(1);
  }

  // Check if email format is valid
  function isValidEmail(email) {
    if (typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  // Password check: 8+ chars, uppercase, number, and special character
  function isValidPassword(password) {
    if (typeof password !== "string") return false;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    return passwordRegex.test(password);
  }

  // Extract initials from name (e.g. "Aarav Sharma" -> "AS")
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

  // Sync Gemini API key to local storage for user and global session
  function syncStoredGeminiKey(email, key) {
    if (typeof localStorage === "undefined") return;
    const trimmed = (key || "").trim();
    try {
      if (trimmed) {
        localStorage.setItem("elevate_gemini_api_key", trimmed);
        if (email) {
          localStorage.setItem("elevate_gemini_api_key_" + email.toLowerCase(), trimmed);
        }
      } else {
        localStorage.removeItem("elevate_gemini_api_key");
        if (email) {
          localStorage.removeItem("elevate_gemini_api_key_" + email.toLowerCase());
        }
      }
    } catch (_) {}
  }

  // Safe getElementById helper
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
    syncStoredGeminiKey: syncStoredGeminiKey,
    byId: byId
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateUtils;
  } else {
    root.ElevateUtils = ElevateUtils;
  }
})(typeof window !== "undefined" ? window : globalThis);
