import test from "node:test";
import assert from "node:assert/strict";

import { TASKS, getTask, listTasks } from "../src/nexus/task-registry.js";
import { selectProvider } from "../src/nexus/model-router.js";
import { runTask } from "../src/nexus/orchestrator.js";
import { validateTaskResult } from "../src/nexus/result-validator.js";
import { buildProjectContext, formatProjectContext } from "../src/nexus/project-context.js";
import { createCharacterLock, formatCharacterForPrompt } from "../src/nexus/character-lock.js";
import { auditContinuity } from "../src/nexus/continuity-audit.js";
import { getTemplate, listTemplates } from "../src/nexus/prompt-templates.js";
import { validateMediaProvider, selectMediaProvider } from "../src/nexus/media-provider-contract.js";
import { runMediaJob } from "../src/nexus/media-pipeline.js";

test("task registry exposes known tasks and rejects unknown IDs", () => {
  assert.ok(listTasks().length >= 4);
  assert.equal(getTask("scene-prompt").id, "scene-prompt");
  assert.equal(getTask("does-not-exist"), null);
});

test("router selects only enabled capable providers and honors priority zero", () => {
  const slow = { id: "slow", enabled: true, capabilities: ["text"], priority: 10, run() {} };
  const zero = { id: "zero", enabled: true, capabilities: ["text"], priority: 0, run() {} };
  const disabled = { id: "disabled", enabled: false, capabilities: ["text"], priority: -10, run() {} };
  const selected = selectProvider(TASKS.series, [slow, disabled, zero]);
  assert.equal(selected.ok, true);
  assert.equal(selected.provider.id, "zero");
  assert.equal(selectProvider(TASKS.series, [disabled]).code, "NO_CAPABLE_PROVIDER");
});

test("orchestrator returns a truthful no-provider failure", async () => {
  const result = await runTask({ taskId: "series", prompt: "اكتب فكرة مسلسل" });
  assert.equal(result.ok, false);
  assert.equal(result.code, "NO_CAPABLE_PROVIDER");
});

test("orchestrator sends bounded project context and validates a successful text result", async () => {
  let seenPrompt = "";
  const provider = {
    id: "test-provider",
    enabled: true,
    capabilities: ["text"],
    async run({ prompt }) {
      seenPrompt = prompt;
      return { text: "  نتيجة اختبار ناجحة  " };
    }
  };
  const result = await runTask({
    taskId: "scene-prompt",
    prompt: "اكتب مشهدًا",
    providers: [provider],
    context: { projectTitle: "فارس الصحراء", characterName: "كايل" }
  });
  assert.equal(result.ok, true);
  assert.equal(result.providerId, "test-provider");
  assert.equal(result.result.text, "نتيجة اختبار ناجحة");
  assert.match(seenPrompt, /فارس الصحراء/);
  assert.match(seenPrompt, /كايل/);
});

test("orchestrator rejects empty prompts, unknown tasks, invalid results and pre-aborted jobs", async () => {
  assert.equal((await runTask({ taskId: "missing", prompt: "x" })).code, "UNKNOWN_TASK");
  assert.equal((await runTask({ taskId: "series", prompt: "   " })).code, "EMPTY_PROMPT");
  const badProvider = { id: "bad", enabled: true, capabilities: ["text"], async run() { return { video: true }; } };
  assert.equal((await runTask({ taskId: "series", prompt: "x", providers: [badProvider] })).code, "INVALID_PROVIDER_RESULT");
  const controller = new AbortController();
  controller.abort();
  assert.equal((await runTask({ taskId: "series", prompt: "x", signal: controller.signal })).code, "ABORTED");
});

test("result validator rejects empty and non-text output and trims valid text", () => {
  assert.equal(validateTaskResult(null, TASKS.series).ok, false);
  assert.equal(validateTaskResult({ json: true }, TASKS.series).ok, false);
  assert.equal(validateTaskResult("  ok  ", TASKS.series).result.text, "ok");
});

test("project context removes control characters and caps oversized fields", () => {
  const context = buildProjectContext({ projectTitle: "  A\u0000B  ", projectSummary: "x".repeat(2000) });
  assert.equal(context.projectTitle, "A B");
  assert.ok(context.projectSummary.length <= 1201);
  assert.match(formatProjectContext(context), /عنوان المشروع/);
});

test("character lock normalizes identity data and formats a stable prompt block", () => {
  const lock = createCharacterLock({
    name: " كايل ",
    description: "شاب بملابس زيتونية",
    traits: ["ندبة فوق الحاجب", "", "عينان بنيتان"],
    visualNotes: "لا تغيّر شكل الوجه"
  });
  assert.equal(lock.name, "كايل");
  assert.equal(lock.traits.length, 2);
  assert.match(formatCharacterForPrompt(lock), /كايل/);
  assert.equal(Object.isFrozen(lock), true);
});

test("continuity audit clearly labels itself text-only", () => {
  const lock = createCharacterLock({ name: "كايل" });
  const missing = auditContinuity({ previousNotes: "", currentNotes: "ممر مظلم", characterLock: lock });
  assert.equal(missing.method, "text-only");
  assert.equal(missing.ok, false);
  const repeated = auditContinuity({ previousNotes: "كايل يدخل الممر", currentNotes: "كايل يدخل الممر", characterLock: lock });
  assert.ok(repeated.issues.some(issue => issue.includes("مطابقة")));
});

test("prompt templates are discoverable and produce scene instructions", () => {
  assert.ok(listTemplates().length >= 3);
  assert.match(getTemplate("cinematic").build({ character: "كايل", scene: "صحراء ليلية" }), /صحراء ليلية/);
  assert.equal(getTemplate("unknown"), null);
});

test("media contract requires explicit capabilities and an adapter", () => {
  assert.equal(validateMediaProvider({ id: "x", enabled: true, capabilities: ["image-to-video"], adapter() {} }).valid, true);
  assert.equal(validateMediaProvider({ id: "x", enabled: true, capabilities: ["unsupported"], adapter() {} }).valid, false);
  assert.equal(selectMediaProvider([], "image-to-video").status, "no-configured-provider");
  assert.equal(selectMediaProvider([], "magic-video").status, "unsupported-capability");
});

test("media pipeline does not claim generation without a provider", async () => {
  const result = await runMediaJob({ capability: "image-to-video" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "no-configured-provider");
});

test("media pipeline accepts an HTTPS asset URL from an injected provider", async () => {
  const provider = {
    id: "mock-media",
    enabled: true,
    capabilities: ["image-to-video"],
    async adapter() { return { assetUrl: "https://media.example/video.mp4", metadata: { duration: 4 }, verified: true }; }
  };
  const result = await runMediaJob({ providers: [provider], capability: "image-to-video" });
  assert.equal(result.ok, true);
  assert.equal(result.providerId, "mock-media");
  assert.equal(result.verified, true);
  assert.equal(result.metadata.duration, 4);
});

test("media pipeline rejects non-HTTPS URLs and URLs containing credentials", async () => {
  const provider = (assetUrl) => ({
    id: "mock-media", enabled: true, capabilities: ["image-to-video"],
    async adapter() { return { assetUrl }; }
  });
  const insecure = await runMediaJob({ providers: [provider("http://media.example/video.mp4")], capability: "image-to-video" });
  assert.equal(insecure.status, "invalid-result");
  const credentialed = await runMediaJob({ providers: [provider("https://user:secret@media.example/video.mp4")], capability: "image-to-video" });
  assert.equal(credentialed.status, "unsafe-url");
});
