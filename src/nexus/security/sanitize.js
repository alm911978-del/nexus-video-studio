/**
 * Input sanitization helpers for NEXUS client and shared logic.
 * These are defense-in-depth, not a substitute for server-side checks.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strip control characters and trim. */
export function stripControlChars(input) {
  if (typeof input !== "string") return "";
  return input.replace(CONTROL_CHARS, " ").trim();
}

/**
 * Bound and clean free text for prompts / notes.
 * @param {string} input
 * @param {number} maxLen
 */
export function sanitizeText(input, maxLen = 12000) {
  const cleaned = stripControlChars(input);
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen);
}

/**
 * Allow only a conservative set of characters for IDs and short labels.
 */
export function sanitizeId(input, maxLen = 64) {
  if (typeof input !== "string") return "";
  return input
    .replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, "")
    .slice(0, maxLen);
}

/**
 * Escape text for safe insertion into HTML text nodes (not attributes).
 * Prefer textContent assignment in UI code; use this only when building strings.
 */
export function escapeHtml(input) {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Remove javascript: and data: from candidate URLs used in UI links.
 * Does not validate reachability.
 */
export function sanitizeHref(input) {
  if (typeof input !== "string") return "";
  const t = input.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return "";
  }
  return t;
}
