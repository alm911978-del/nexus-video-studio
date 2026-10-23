import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDatabase } from "../src/nexus/backup-schema.js";

const validBackup = () => ({
  schemaVersion: 1,
  exportedAt: "2026-10-23T00:00:00.000Z",
  projects: [{ id: "project_1", name: "فارس الصحراء الأخير", summary: "خيال علمي", style: "سينمائي شبه واقعي", ratio: "9:16 عمودي" }],
  characters: [{ id: "character_1", name: "كايل", desc: "ندبة فوق الحاجب الأيسر" }],
  scenes: [{ id: "scene_1", name: "المشهد الأول", prompt: "لقطة صحراوية", project: "project_1", character: "character_1" }]
});

test("backup normalizer accepts a valid backup and retains only supported fields", () => {
  const source = validBackup();
  source.projects[0].isAdmin = true;
  const result = normalizeDatabase(source);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.projects[0], {
    id: "project_1",
    name: "فارس الصحراء الأخير",
    summary: "خيال علمي",
    style: "سينمائي شبه واقعي",
    ratio: "9:16 عمودي"
  });
  assert.equal("schemaVersion" in result.data, false);
  assert.equal(result.warnings.length, 0);
});

test("backup normalizer rejects non-objects and missing collections", () => {
  assert.equal(normalizeDatabase(null).ok, false);
  assert.equal(normalizeDatabase([]).ok, false);
  assert.equal(normalizeDatabase({ projects: [], characters: [] }).ok, false);
});

test("unsafe or duplicate IDs are replaced with unique safe IDs", () => {
  const source = validBackup();
  source.projects[0].id = 'x" onclick="alert(1)';
  source.characters[0].id = "project_1";
  const ids = ["safe_replacement", "safe_character", "safe_scene"];
  const result = normalizeDatabase(source, { idFactory: () => ids.shift() });
  assert.equal(result.ok, true);
  assert.match(result.data.projects[0].id, /^[A-Za-z0-9_-]+$/);
  assert.equal(result.data.projects[0].id, "safe_replacement");
  assert.equal(result.data.characters[0].id, "safe_character");
  assert.equal(result.data.scenes[0].id, "scene_1");
  assert.equal(result.data.scenes[0].project, "");
  assert.equal(result.data.scenes[0].character, "");
  assert.ok(result.warnings.length > 0);
});

test("invalid records and orphan associations are safely discarded", () => {
  const source = validBackup();
  source.characters.push(null, { id: "no-name", desc: "ignored" });
  source.scenes.push({ id: "orphan", name: "مشهد يتيم", prompt: "وصف", project: "missing", character: "missing" });
  const result = normalizeDatabase(source);
  assert.equal(result.ok, true);
  assert.equal(result.data.characters.length, 1);
  assert.equal(result.data.scenes[1].project, "");
  assert.equal(result.data.scenes[1].character, "");
  assert.ok(result.warnings.length >= 3);
});

test("large text and unsupported aspect ratios are bounded and normalized", () => {
  const source = validBackup();
  source.projects[0].summary = "x".repeat(100000);
  source.projects[0].ratio = "2:1";
  source.scenes[0].prompt = "p".repeat(100000);
  const result = normalizeDatabase(source);
  assert.equal(result.data.projects[0].summary.length, 6000);
  assert.equal(result.data.projects[0].ratio, "9:16 عمودي");
  assert.equal(result.data.scenes[0].prompt.length, 20000);
});

test("record IDs remain unique across entity types", () => {
  const source = validBackup();
  source.characters[0].id = source.projects[0].id;
  const result = normalizeDatabase(source);
  const ids = [...result.data.projects, ...result.data.characters, ...result.data.scenes].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
});
