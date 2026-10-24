/**
 * Build a bounded, sanitized project context for prompt injection.
 * Never trusts raw user data blindly; length and structure are capped.
 */
const MAX_CHARS = 4000;
const MAX_FIELD = 800;

function clip(text, limit = MAX_FIELD) {
  if (typeof text !== "string") return "";
  const cleaned = text.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return cleaned.length > limit ? cleaned.slice(0, limit) + "…" : cleaned;
}

export function buildProjectContext(raw = {}) {
  const ctx = {
    projectTitle: clip(raw.projectTitle || raw.title || ""),
    projectSummary: clip(raw.projectSummary || raw.summary || "", 1200),
    characterName: clip(raw.characterName || ""),
    characterDescription: clip(raw.characterDescription || raw.character || "", 1200),
    sceneNotes: clip(raw.sceneNotes || "", 800),
    continuityNotes: clip(raw.continuityNotes || "", 600)
  };
  return ctx;
}

export function formatProjectContext(ctx) {
  if (!ctx) return "";
  const lines = [];
  if (ctx.projectTitle) lines.push("عنوان المشروع: " + ctx.projectTitle);
  if (ctx.projectSummary) lines.push("ملخص المشروع: " + ctx.projectSummary);
  if (ctx.characterName) lines.push("الشخصية: " + ctx.characterName);
  if (ctx.characterDescription) lines.push("وصف الشخصية: " + ctx.characterDescription);
  if (ctx.sceneNotes) lines.push("ملاحظات المشهد: " + ctx.sceneNotes);
  if (ctx.continuityNotes) lines.push("ملاحظات الاستمرارية: " + ctx.continuityNotes);
  const text = lines.join("\n");
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "…" : text;
}
