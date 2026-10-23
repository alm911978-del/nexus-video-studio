/**
 * NEXUS Character Lock: portable identity constraints for scene-generation providers.
 * This module prepares prompts/metadata; it does not itself generate or inspect media.
 */
const MAX_TEXT = 2400;
const clean = (value, max = MAX_TEXT) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function createCharacterLock(input = {}) {
  const identity = {
    id: clean(input.id, 100),
    name: clean(input.name, 120),
    ageAppearance: clean(input.ageAppearance, 120),
    face: clean(input.face),
    hair: clean(input.hair),
    eyes: clean(input.eyes),
    distinguishingMarks: clean(input.distinguishingMarks),
    wardrobe: clean(input.wardrobe),
    bodyBuild: clean(input.bodyBuild, 500),
    voice: clean(input.voice, 500),
    referenceAssetIds: Array.isArray(input.referenceAssetIds)
      ? input.referenceAssetIds.filter(x => typeof x === "string").map(x => x.trim()).filter(Boolean).slice(0, 8)
      : []
  };
  const missing = ["name", "face", "hair", "wardrobe"].filter(key => !identity[key]);
  return Object.freeze({ schemaVersion: 1, identity: Object.freeze(identity), missingRequiredFields: missing });
}

export function buildCharacterContinuityPrompt(lock, sceneDescription) {
  if (!lock || lock.schemaVersion !== 1 || !lock.identity) {
    throw new TypeError("A valid NEXUS Character Lock is required.");
  }
  const i = lock.identity;
  const lines = [
    "CHARACTER CONTINUITY — preserve the same character identity across shots.",
    `Character: ${i.name || "unspecified"}`,
    i.ageAppearance && `Apparent age: ${i.ageAppearance}`,
    i.face && `Face: ${i.face}`,
    i.hair && `Hair: ${i.hair}`,
    i.eyes && `Eyes: ${i.eyes}`,
    i.distinguishingMarks && `Distinguishing marks: ${i.distinguishingMarks}`,
    i.wardrobe && `Wardrobe: ${i.wardrobe}`,
    i.bodyBuild && `Build: ${i.bodyBuild}`,
    i.voice && `Voice continuity: ${i.voice}`,
    "Do not redesign the face, change hair/wardrobe, alter distinguishing marks, or add unrequested accessories.",
    "Keep lighting and camera changes from unintentionally changing perceived identity. Use supplied reference assets when the provider supports them.",
    `SCENE: ${clean(sceneDescription, 4000) || "No scene description supplied."}`
  ];
  return lines.filter(Boolean).join("\n");
}
