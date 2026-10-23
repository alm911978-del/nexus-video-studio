import test from "node:test";
import assert from "node:assert/strict";
import { auditSceneContinuity } from "../src/nexus/continuity-audit.js";
import { listPromptTemplates, PROMPT_TEMPLATES } from "../src/nexus/prompt-templates.js";

test("continuity audit flags textual mismatches without claiming visual verification", () => {
  const result = auditSceneContinuity(
    { face: "small scar", hair: "short black", wardrobe: "olive jacket" },
    { face: "small scar", hair: "long blond", wardrobe: "olive jacket" }
  );
  assert.deepEqual(result.summary.reviewRequired, ["hair"]);
  assert.equal(result.summary.score, 67);
  assert.match(result.summary.scoreMeaning, /not a visual identity score/i);
});

test("continuity audit distinguishes unknown fields from mismatches", () => {
  const result = auditSceneContinuity({ face: "same face" }, {});
  assert.equal(result.checks.find(item => item.field === "face").status, "not-reviewed");
  assert.equal(result.checks.find(item => item.field === "hair").status, "not-specified");
  assert.equal(result.summary.score, null);
});

test("prompt templates build bounded image-to-video instructions", () => {
  const prompt = PROMPT_TEMPLATES.imageToVideo.build({
    subjectMotion: "slowly turns head",
    duration: 900
  });
  assert.match(prompt, /slowly turns head/);
  assert.match(prompt, /30 seconds/);
  assert.match(prompt, /Preserve the original subject identity/);
});

test("dialogue template separates text instructions from real lip-sync processing", () => {
  const prompt = PROMPT_TEMPLATES.dialoguePerformance.build({dialogue:"مرحبًا",language:"Arabic"});
  assert.match(prompt, /مرحبًا/);
  assert.match(prompt, /Do not claim lip synchronization/);
  assert.equal(listPromptTemplates().length, 3);
});
