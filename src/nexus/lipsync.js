import { runMediaJob } from "./media-pipeline.js";

/**
 * Routes speech-driven facial animation to an explicitly configured adapter.
 * Audio generation and lip-sync are separate capabilities; this function expects audio
 * or text to be handled by the chosen audio-lip-sync provider.
 */
export async function runLipSyncJob({ providers, input = {}, onProgress } = {}) {
  const audio = typeof input.audio === "string" ? input.audio.trim() : "";
  const text = typeof input.text === "string" ? input.text.trim().slice(0, 12000) : "";
  if (!audio && !text) {
    return { ok: false, status: "invalid-input", error: "Supply audio or dialogue text." };
  }
  if (input.language && typeof input.language !== "string") {
    return { ok: false, status: "invalid-input", error: "Language must be a string." };
  }
  return runMediaJob({
    mode: "audio-lip-sync",
    providers,
    input: {
      ...input,
      prompt: [
        "Create natural speech-synchronized facial animation.",
        "Preserve the reference person's identity, facial proportions, skin texture, hair and wardrobe.",
        "Use restrained head motion and natural blinking; avoid exaggerated mouth movement.",
        input.language ? `Dialogue language: ${input.language}.` : "",
        text ? `Dialogue transcript: ${text}` : ""
      ].filter(Boolean).join("\n"),
      audio: audio || null
    },
    onProgress
  });
}
