/**
 * Capability contract for external image-to-video and speech/lip-sync providers.
 * A provider is usable only when explicitly configured by the application.
 * No API vendor, free tier, or model availability is assumed here.
 */
const MODES = new Set(["image-to-video", "text-audio-to-video", "audio-lip-sync", "video-upscale"]);

export function validateMediaProvider(provider) {
  const errors = [];
  if (!provider || typeof provider !== "object") return { valid: false, errors: ["Provider config is required."] };
  if (typeof provider.id !== "string" || !provider.id.trim()) errors.push("Provider id is required.");
  if (!Array.isArray(provider.capabilities) || provider.capabilities.length === 0) {
    errors.push("At least one explicit capability is required.");
  } else if (provider.capabilities.some(cap => !MODES.has(cap))) {
    errors.push("Provider contains an unsupported capability.");
  }
  if (typeof provider.enabled !== "boolean") errors.push("Provider enabled must be an explicit boolean.");
  if (typeof provider.adapter !== "function") errors.push("Provider adapter function is required.");
  return { valid: errors.length === 0, errors };
}

export function selectMediaProvider(providers, capability) {
  if (!MODES.has(capability)) return { ok: false, status: "unsupported-capability", provider: null };
  const candidates = Array.isArray(providers) ? providers : [];
  const provider = candidates.find(p =>
    p && p.enabled === true && Array.isArray(p.capabilities) &&
    p.capabilities.includes(capability) && typeof p.adapter === "function"
  );
  return provider
    ? { ok: true, status: "provider-selected", provider }
    : { ok: false, status: "no-configured-provider", provider: null, capability };
}
