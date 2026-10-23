const safe = (value, max = 2400) => typeof value === "string" ? value.trim().slice(0, max) : "";

export const PROMPT_TEMPLATES = Object.freeze({
  cinematicShot: Object.freeze({
    label: "لقطة سينمائية واقعية",
    fields: ["character", "action", "location", "lighting", "camera", "mood"],
    build(values = {}) {
      return [
        "Create a photorealistic cinematic film shot, not a music-video montage.",
        values.character && `CHARACTER CONTINUITY: ${safe(values.character)}`,
        values.action && `ACTION: ${safe(values.action)}`,
        values.location && `LOCATION: ${safe(values.location)}`,
        values.lighting && `LIGHTING: ${safe(values.lighting)}`,
        values.camera && `CAMERA: ${safe(values.camera)}`,
        values.mood && `MOOD: ${safe(values.mood)}`,
        "Maintain natural anatomy, realistic materials, consistent wardrobe, coherent shadows and plausible motion.",
        "Avoid face drift, extra fingers, warped eyes, flickering details, sudden costume changes, floating objects and unreadable text."
      ].filter(Boolean).join("\n");
    }
  }),
  imageToVideo: Object.freeze({
    label: "تحريك صورة مرجعية",
    fields: ["subjectMotion", "cameraMotion", "environmentMotion", "duration"],
    build(values = {}) {
      return [
        "Animate the supplied reference image into one continuous cinematic shot.",
        `SUBJECT MOTION: ${safe(values.subjectMotion) || "Subtle natural breathing and restrained movement"}`,
        `CAMERA MOTION: ${safe(values.cameraMotion) || "Slow stable push-in; no abrupt cuts"}`,
        `ENVIRONMENT: ${safe(values.environmentMotion) || "Only physically plausible ambient motion"}`,
        `TARGET DURATION: ${Math.max(1, Math.min(30, Number(values.duration) || 5))} seconds`,
        "Preserve the original subject identity, face, outfit, composition and key objects throughout the shot.",
        "No scene cuts, no identity changes, no morphing, no invented accessories, no unstable geometry."
      ].join("\n");
    }
  }),
  dialoguePerformance: Object.freeze({
    label: "أداء حوار ومزامنة شفاه",
    fields: ["dialogue", "language", "delivery", "camera"],
    build(values = {}) {
      return [
        "Prepare a natural dialogue performance for a compatible audio-driven lip-sync engine.",
        `LANGUAGE: ${safe(values.language, 100) || "Arabic"}`,
        `DIALOGUE: ${safe(values.dialogue, 6000)}`,
        `DELIVERY: ${safe(values.delivery) || "Natural pacing, emotionally grounded, clear articulation"}`,
        `CAMERA: ${safe(values.camera) || "Stable close-up, face clearly visible"}`,
        "Preserve facial identity; align mouth movement to the actual phonemes and timing of the supplied audio.",
        "Do not claim lip synchronization unless a compatible engine processes the audio and returns a rendered result."
      ].join("\n");
    }
  })
});

export function listPromptTemplates() {
  return Object.entries(PROMPT_TEMPLATES).map(([id, template]) => ({
    id, label: template.label, fields: [...template.fields]
  }));
}
