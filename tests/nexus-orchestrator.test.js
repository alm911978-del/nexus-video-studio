/**
 * Baseline unit tests for NEXUS orchestrator foundations.
 * Run with: node --test tests/nexus-orchestrator.test.js
 * No network, no secrets, no external providers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getTask, listTasks } from "../src/nexus/task-registry.js";
import { selectProvider } from "../src/nexus/model-router.js";
import { validateMediaProvider, selectMediaProvider } from "../src/nexus/media-provider-contract.js";
import { createCharacterLock, formatCharacterForPrompt } from "../src/nexus/character-lock.js";
import { buildProjectContext, formatProjectContext } from "../src/nexus/project-context.js";
import { validateTaskResult } from "../src/nexus/result-validator.js";
import { runTask } from "../src/nexus/orchestrator.js";

describe("task-registry", () => {
  it("returns known tasks", () => {
    const t = getTask("scene-prompt");
    assert.equal(t.id, "scene-prompt");
    assert.equal(t.providerCapability, "text");
  });
  it("returns null for unknown task", () => {
    assert.equal(getTask("does-not-exist"), null);
  });
  it("lists at least four tasks", () => {
    assert.ok(listTasks().length >= 4);
  });
});

describe("model-router", () => {
  it("selects enabled provider with matching capability and lowest priority", () => {
    const task = getTask("series");
    const providers = [
      { id: "b", enabled: true, capabilities: ["text"], priority: 20, run: async () => ({ text: "ok" }) },
      { id: "a", enabled: true, capabilities: ["text"], priority: 0, run: async () => ({ text: "ok" }) },
      { id: "off", enabled: false, capabilities: ["text"], priority: -1, run: async () => ({ text: "no" }) }
    ];
    const route = selectProvider(task, providers);
    assert.equal(route.ok, true);
    assert.equal(route.provider.id, "a"); // priority 0 wins
  });
  it("fails when no capable provider", () => {
    const task = getTask("series");
    const route = selectProvider(task, [{ id: "x", enabled: true, capabilities: ["image"], run: async () => {} }]);
    assert.equal(route.ok, false);
    assert.equal(route.code, "NO_CAPABLE_PROVIDER");
  });
});

describe("media-provider-contract", () => {
  it("rejects invalid provider", () => {
    const v = validateMediaProvider({ id: "", capabilities: [], enabled: true });
    assert.equal(v.valid, false);
  });
  it("accepts valid provider shape", () => {
    const v = validateMediaProvider({
      id: "demo",
      capabilities: ["image-to-video"],
      enabled: true,
      adapter: async () => ({})
    });
    assert.equal(v.valid, true);
  });
  it("selects configured media provider", () => {
    const providers = [{
      id: "p1",
      enabled: true,
      capabilities: ["image-to-video"],
      adapter: async () => ({ assetUrl: "https://example.com/v.mp4" })
    }];
    const sel = selectMediaProvider(providers, "image-to-video");
    assert.equal(sel.ok, true);
    assert.equal(sel.provider.id, "p1");
  });
  it("reports no-configured-provider when missing", () => {
    const sel = selectMediaProvider([], "image-to-video");
    assert.equal(sel.ok, false);
    assert.equal(sel.status, "no-configured-provider");
  });
});

describe("character-lock", () => {
  it("creates a frozen lock with cleaned fields", () => {
    const lock = createCharacterLock({
      name: "  ليلى  ",
      description: "شخصية رئيسية",
      traits: ["هادئة", "ذكية"]
    });
    assert.equal(lock.name, "ليلى");
    assert.ok(Object.isFrozen(lock));
    const text = formatCharacterForPrompt(lock);
    assert.ok(text.includes("ليلى"));
  });
});

describe("project-context", () => {
  it("builds and formats bounded context", () => {
    const ctx = buildProjectContext({
      projectTitle: "فيلم تجريبي",
      characterName: "ليلى",
      sceneNotes: "مشهد ليلي"
    });
    const text = formatProjectContext(ctx);
    assert.ok(text.includes("فيلم تجريبي"));
    assert.ok(text.includes("ليلى"));
  });
});

describe("result-validator", () => {
  it("accepts non-empty text result", () => {
    const v = validateTaskResult({ text: "نتيجة صحيحة" }, getTask("scene-prompt"));
    assert.equal(v.ok, true);
    assert.equal(v.result.outputKind, "scene-prompt");
  });
  it("rejects empty result", () => {
    const v = validateTaskResult({ text: "   " }, getTask("scene-prompt"));
    assert.equal(v.ok, false);
  });
});

describe("orchestrator", () => {
  it("fails cleanly on unknown task", async () => {
    const out = await runTask({ taskId: "nope", prompt: "x" });
    assert.equal(out.ok, false);
    assert.equal(out.code, "UNKNOWN_TASK");
  });
  it("fails cleanly on empty prompt", async () => {
    const out = await runTask({ taskId: "series", prompt: "  " });
    assert.equal(out.ok, false);
    assert.equal(out.code, "EMPTY_PROMPT");
  });
  it("runs a mock provider successfully", async () => {
    const providers = [{
      id: "mock",
      enabled: true,
      capabilities: ["text"],
      priority: 0,
      run: async ({ prompt }) => ({ text: "MOCK: " + prompt.slice(0, 40) })
    }];
    const out = await runTask({
      taskId: "scene-prompt",
      prompt: "وصف مشهد في الصحراء",
      providers,
      context: { projectTitle: "اختبار" }
    });
    assert.equal(out.ok, true);
    assert.equal(out.providerId, "mock");
    assert.ok(out.result.text.startsWith("MOCK:"));
  });
  it("returns NO_CAPABLE_PROVIDER when none match", async () => {
    const out = await runTask({
      taskId: "series",
      prompt: "طور مسلسل",
      providers: [{ id: "img", enabled: true, capabilities: ["image"], run: async () => ({}) }]
    });
    assert.equal(out.ok, false);
    assert.equal(out.code, "NO_CAPABLE_PROVIDER");
  });
});
