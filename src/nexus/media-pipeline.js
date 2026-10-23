import { selectMediaProvider } from "./media-provider-contract.js";

const MAX_PROMPT = 12000;
const ALLOWED_ASPECT_RATIOS = new Set(["9:16", "16:9", "1:1", "4:5", "3:2"]);
const ALLOWED_QUALITY = new Set(["standard", "high", "highest-available"]);

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isSafeAssetUrl(value) {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001F\u007F]/.test(candidate)) return false;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Dispatches a job to an explicitly configured provider adapter.
 * Returns truthful status metadata; does not fake a media URL or claim quality.
 */
export async function runMediaJob({ mode, providers, input = {}, onProgress = () => {} } = {}) {
  const selected = selectMediaProvider(providers, mode);
  if (!selected.ok) return { ok: false, status: selected.status, capability: mode };

  const prompt = cleanText(input.prompt, MAX_PROMPT);
  if (!prompt) return { ok: false, status: "invalid-input", error: "A non-empty prompt is required." };

  const aspectRatio = input.aspectRatio || "9:16";
  const quality = input.quality || "high";
  if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    return { ok: false, status: "invalid-input", error: "Unsupported aspect ratio." };
  }
  if (!ALLOWED_QUALITY.has(quality)) {
    return { ok: false, status: "invalid-input", error: "Unsupported quality preference." };
  }

  const payload = {
    prompt,
    aspectRatio,
    quality,
    durationSeconds: Number.isFinite(input.durationSeconds)
      ? Math.max(1, Math.min(30, Math.round(input.durationSeconds)))
      : 5,
    referenceImage: typeof input.referenceImage === "string" ? input.referenceImage : null,
    audio: typeof input.audio === "string" ? input.audio : null,
    characterLock: input.characterLock || null,
    metadata: { requestedMode: mode, qualityIsPreferenceNotGuarantee: true }
  };

  try {
    onProgress({ status: "submitted", providerId: selected.provider.id });
    const result = await selected.provider.adapter({ mode, input: payload, onProgress });
    if (!result || result.status !== "completed") {
      return {
        ok: false,
        status: "provider-not-completed",
        providerId: selected.provider.id,
        detail: "The provider adapter did not report a completed job."
      };
    }
    if (!isSafeAssetUrl(result.assetUrl)) {
      return {
        ok: false,
        status: "provider-returned-invalid-asset-url",
        providerId: selected.provider.id,
        detail: "Expected an absolute HTTPS URL without embedded credentials or control characters. URL validation does not verify remote file availability or contents."
      };
    }
    return {
      ok: true,
      status: "completed",
      providerId: selected.provider.id,
      assetUrl: result.assetUrl.trim(),
      mediaType: typeof result.mediaType === "string" ? result.mediaType : "unknown",
      completionNote: "Provider reported completion and returned a syntactically valid HTTPS URL; remote file availability and contents were not independently verified.",
      qualityNote: "Requested quality is not a guarantee; verify the returned asset and provider metadata."
    };
  } catch (error) {
    return {
      ok: false,
      status: "provider-error",
      providerId: selected.provider.id,
      error: error instanceof Error ? error.message : "Unknown provider error."
    };
  }
}
