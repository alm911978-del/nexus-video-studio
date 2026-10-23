import test from "node:test";
import assert from "node:assert/strict";
import { listTasks } from "../src/nexus/task-registry.js";
import { selectProvider } from "../src/nexus/model-router.js";
import { buildProjectContext, formatProjectContext } from "../src/nexus/project-context.js";
import { validateTaskResult } from "../src/nexus/result-validator.js";
import { runTask } from "../src/nexus/orchestrator.js";

test("registry exposes the four gateway-compatible tasks", () => {
  assert.deepEqual(listTasks().map(task => task.id).sort(), ["continuity", "episode", "scene-prompt", "series"]);
});

test("router refuses when no capable enabled provider exists", () => {
  assert.equal(selectProvider({ providerCapability: "text" }, []).code, "NO_CAPABLE_PROVIDER");
});

test("router chooses the enabled capable provider with highest priority", () => {
  const a = { id: "later", enabled: true, capabilities: ["text"], priority: 20, run() {} };
  const b = { id: "first", enabled: true, capabilities: ["text"], priority: 1, run() {} };
  assert.equal(selectProvider({ providerCapability: "text" }, [a, b]).provider.id, "first");
});

test("project context only accepts strings and is bounded", () => {
  const context = buildProjectContext({ facts: [" Kael ", 4, ""], notes: ["x".repeat(13000)] });
  assert.deepEqual(context.facts, ["Kael"]);
  assert.ok(JSON.stringify(context).length <= 12000);
  assert.ok(formatProjectContext(context).length > 0);
});

test("validator rejects empty output", () => {
  assert.equal(validateTaskResult(" ", { id: "episode", outputKind: "episode-script" }).ok, false);
});

test("orchestrator returns a clear error when no provider is configured", async () => {
  const result = await runTask({ taskId: "scene-prompt", prompt: "وصف مشهد" });
  assert.equal(result.ok, false);
  assert.equal(result.code, "NO_CAPABLE_PROVIDER");
});

test("orchestrator executes injected provider and validates result", async () => {
  const provider = {
    id: "test-provider",
    enabled: true,
    capabilities: ["text"],
    async run({ prompt }) {
      assert.match(prompt, /Kael/);
      return "وصف سينمائي صالح";
    }
  };
  const result = await runTask({
    taskId: "scene-prompt",
    prompt: "اكتب المشهد",
    providers: [provider],
    context: { facts: ["Kael"] }
  });
  assert.equal(result.ok, true);
  assert.equal(result.providerId, "test-provider");
  assert.equal(result.result, "وصف سينمائي صالح");
});
