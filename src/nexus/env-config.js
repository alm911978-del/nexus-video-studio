/**
 * Client-visible configuration only (never secrets).
 * Operator secrets stay in Cloudflare Worker / engine host env.
 */
export const PUBLIC_CONFIG = Object.freeze({
  productName: "NEXUS VIDEO 5.0",
  prototypeLabel: "Prototype 0.4 · محلي · آمن",
  storageKey: "nexus-video-50-local-v4",
  /** Worker URL is user-supplied in UI when used; empty means not configured */
  defaultWorkerHint: "",
  videoEngineStatus: "not_configured",
  freeFirst: true
});

export function isSecretKeyName(name) {
  if (typeof name !== "string") return false;
  return /(api[_-]?key|secret|token|password|private[_-]?key)/i.test(name);
}

/** Strip any accidental secret-looking keys from a plain object before display/log */
export function redactSecrets(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (isSecretKeyName(k)) out[k] = "[REDACTED]";
    else if (v && typeof v === "object") out[k] = redactSecrets(v);
    else out[k] = v;
  }
  return out;
}
