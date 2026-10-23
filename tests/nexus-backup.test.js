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

test("backup normalizer rejects a newer unsupported schema instead of silently dropping fields", () => {
  const source = validBackup();
  source.schemaVersion = 2;
  const result = normalizeDatabase(source);
  assert.equal(result.ok, false);
  assert.match(result.error, /أحدث من إصدار NEXUS/);
});

test("unsafe record IDs are replaced with safe IDs", () => {
  const source = validBackup();
  source.projects[0].id = 'x" onclick="alert(1)';
  const ids = ["safe_replacement"];
  const result = normalizeDatabase(source, { idFactory: () => ids.shift() || "generated_safe_id" });
  assert.equal(result.ok, true);
  assert.equal(result.data.projects[0].id, "safe_replacement");
  assert.match(result.data.projects[0].id, /^[A-Za-z0-9_-]+$/);
  assert.equal(result.data.characters[0].id, "character_1");
  assert.ok(result.warnings.length > 0);
});

test("duplicate IDs are replaced and project/character references stay correctly typed", () => {
  const source = validBackup();
  source.characters[0].id = "project_1";
  source.scenes[0].character = "project_1";
  const result = normalizeDatabase(source, { idFactory: () => "safe_character" });
  assert.equal(result.ok, true);
  assert.equal(result.data.projects[0].id, "project_1");
  assert.equal(result.data.characters[0].id, "safe_character");
  assert.equal(result.data.scenes[0].project, "project_1");
  assert.equal(result.data.scenes[0].character, "safe_character");
  const ids = [...result.data.projects, ...result.data.characters, ...result.data.scenes].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length);
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

test("prompt lab draft is included in backups and retains valid project/character links", () => {
  const source = validBackup();
  source.promptLabDraft = {
    plSavedProject: "project_1",
    plSavedCharacter: "character_1",
    plName: "كايل",
    plTemplate: "dialogue",
    plOutput: "جهّز حوارًا سينمائيًا"
  };
  const result = normalizeDatabase(source);
  assert.equal(result.ok, true);
  assert.equal(result.data.promptLabDraft.plSavedProject, "project_1");
  assert.equal(result.data.promptLabDraft.plSavedCharacter, "character_1");
  assert.equal(result.data.promptLabDraft.plTemplate, "dialogue");
  assert.equal(result.data.promptLabDraft.plOutput, "جهّز حوارًا سينمائيًا");
});

test("prompt lab draft rejects orphan links and bounds untrusted fields", () => {
  const source = validBackup();
  source.promptLabDraft = {
    plSavedProject: "missing",
    plSavedCharacter: "missing",
    plTemplate: "attacker-template",
    plOutput: "x".repeat(50000),
    secret: "must be dropped"
  };
  const result = normalizeDatabase(source);
  assert.equal(result.ok, true);
  assert.equal(result.data.promptLabDraft.plSavedProject, "");
  assert.equal(result.data.promptLabDraft.plSavedCharacter, "");
  assert.equal(result.data.promptLabDraft.plTemplate, "cinematic");
  assert.equal(result.data.promptLabDraft.plOutput.length, 12000);
  assert.equal("secret" in result.data.promptLabDraft, false);
  assert.ok(result.warnings.length >= 3);
});

test("activity history keeps only validated fields and sorts by timestamp", () => {
  const source = validBackup();
  source.activity = [
    { id: "activity_late", type: "scene-edited", title: "تعديل مشهد", detail: "وصف", at: "2026-10-23T02:00:00.000Z", secret: "drop" },
    { id: "activity_early", type: "project-created", title: "إنشاء مشروع", detail: "", at: "2026-10-23T01:00:00.000Z" }
  ];
  const result = normalizeDatabase(source);
  assert.equal(result.ok, true);
  assert.equal(result.data.activity.length, 2);
  assert.equal(result.data.activity[0].id, "activity_early");
  assert.equal(result.data.activity[1].id, "activity_late");
  assert.equal("secret" in result.data.activity[1], false);
});

test("activity history drops malformed entries and retains only the latest 200 records", () => {
  const source = validBackup();
  source.activity = Array.from({ length: 205 }, (_, index) => ({
    id: "activity_" + index,
    type: "scene-created",
    title: "عملية " + index,
    detail: "detail",
    at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()
  }));
  source.activity.push({ id: "bad_event", type: "unknown-type", title: "غير معروف", at: "not-a-date" });
  const result = normalizeDatabase(source);
  assert.equal(result.ok, true);
  assert.equal(result.data.activity.length, 200);
  assert.equal(result.data.activity[0].title, "عملية 5");
  assert.ok(result.warnings.length > 0);
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
