/**
 * Structured character identity lock.
 * Keeps the same character description stable across scenes/prompts.
 * Does not claim visual consistency; that requires a real image-to-video provider.
 */
const MAX_NAME = 120;
const MAX_DESC = 2500;

function clean(text, limit) {
  if (typeof text !== "string") return "";
  return text.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, limit);
}

export function createCharacterLock({ name = "", description = "", traits = [], visualNotes = "" } = {}) {
  return Object.freeze({
    name: clean(name, MAX_NAME),
    description: clean(description, MAX_DESC),
    traits: Array.isArray(traits)
      ? traits.map(t => clean(String(t), 80)).filter(Boolean).slice(0, 20)
      : [],
    visualNotes: clean(visualNotes, 800),
    lockedAt: new Date().toISOString()
  });
}

export function formatCharacterForPrompt(lock) {
  if (!lock || !lock.name) return "";
  const parts = [`الشخصية: ${lock.name}`];
  if (lock.description) parts.push(`الوصف الثابت: ${lock.description}`);
  if (lock.traits.length) parts.push(`سمات: ${lock.traits.join("، ")}`);
  if (lock.visualNotes) parts.push(`ملاحظات بصرية: ${lock.visualNotes}`);
  return parts.join("\n");
}
