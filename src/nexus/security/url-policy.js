/**
 * Strict URL policy for media assets and external links.
 * Media pipeline requires absolute HTTPS without credentials or control chars.
 */

const UNSAFE_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * @param {string} url
 * @returns {{ ok: boolean, reason?: string, url?: string }}
 */
export function assertSafeHttpsAssetUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return { ok: false, reason: "empty-url" };
  }
  const trimmed = url.trim();
  if (UNSAFE_CHARS.test(trimmed)) {
    return { ok: false, reason: "control-chars" };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "not-https" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials-in-url" };
  }
  // Block obvious local / metadata targets for browser-side fetches
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    host.startsWith("169.254.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return { ok: false, reason: "private-or-local-host" };
  }
  // Block IPv6 unique-local (fc00::/7) and link-local (fe80::/10) ranges.
  const normalizedIpv6 = host.replace(/^\[|\]$/g, "");
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(normalizedIpv6) || /^fe[89ab][0-9a-f]:/i.test(normalizedIpv6)) {
    return { ok: false, reason: "private-or-local-host" };
  }
  return { ok: true, url: parsed.toString() };
}

/**
 * Allowlist helper for Worker / engine base URLs (operator-configured).
 */
export function isAllowedOrigin(origin, allowlist = []) {
  if (typeof origin !== "string" || !Array.isArray(allowlist)) return false;
  return allowlist.includes(origin);
}
