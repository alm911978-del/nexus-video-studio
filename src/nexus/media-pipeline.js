import { selectMediaProvider } from "./media-provider-contract.js";

const MAX_PROMPT = 12000;
const ALLOWED_ASPECT_RATIOS = new Set(["9:16", "16:9", "1:1", "4:5", "3:2"]);
const ALLOWED_QUALITY = new Set(["standard", "high", "highest-available"]);

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
    if (!result || result.status !== "completed" || typeof result.assetUrl !== "string" || !result.assetUrl.trim()) {
      return {
        ok: false,
        status: "provider-did-not-return-verified-asset",
        providerId: selected.provider.id,
        detail: "The adapter did not return a completed result with an asset URL."
      };
    }
    return {
      ok: true,
      status: "completed",
      providerId: selected.provider.id,
      assetUrl: result.assetUrl,
      mediaType: typeof result.mediaType === "string" ? result.mediaType : "unknown",
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
