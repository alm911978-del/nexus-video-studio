/**
 * Security header constants for documentation and future server injection.
 * GitHub Pages cannot set all of these; Cloudflare / custom host should.
 */

export const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
});

/**
 * Baseline CSP string. Tighten connect-src to your Worker hostname after deploy.
 * 'unsafe-inline' is a known temporary trade-off for the current SPA structure.
 */
export function buildContentSecurityPolicy({ workerOrigin = "https://*.workers.dev", extraConnect = [] } = {}) {
  const connect = ["'self'", workerOrigin, "https://challenges.cloudflare.com", "https://*.supabase.co", ...extraConnect];
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src " + connect.join(" "),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'"
  ].join("; ");
}

export function securityHeadersAsMeta() {
  // Only a subset can be expressed as meta; prefer HTTP headers at the edge.
  return {
    csp: buildContentSecurityPolicy(),
    referrer: "strict-origin-when-cross-origin"
  };
}
