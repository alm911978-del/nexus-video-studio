import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(moduleMatch, "index.html must contain the application module script");
const moduleSource = moduleMatch[1];
const sourceWithoutImports = moduleSource.replace(/^\s*import\s+\{[^}]+\}\s+from\s+["'][^"']+["'];\s*/m, "");

test("main UI module parses as valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(sourceWithoutImports));
});

test("HTML element IDs are unique", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("all static DOM IDs referenced by the main UI exist in the page", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const references = [...moduleSource.matchAll(/\$\(\s*["']([^"']+)["']\s*\)/g)].map(match => match[1]);
  const missing = [...new Set(references.filter(id => !ids.has(id)))];
  assert.deepEqual(missing, []);
});

test("backup import is normalized and restores the included prompt lab draft", () => {
  assert.match(moduleSource, /const normalized\s*=\s*normalizeDatabase\(x\)/);
  assert.match(moduleSource, /db\s*=\s*normalized\.data/);
  assert.match(moduleSource, /schemaVersion:1/);
  assert.match(moduleSource, /db\.promptLabDraft=draft/);
  assert.match(moduleSource, /render\(\);\s*restorePromptLabDraft\(\)/);
  assert.match(html, /id="plSavedProject"/);
});

test("scene library supports search and edit-in-place", () => {
  assert.match(html, /id="sceneSearch"/);
  assert.match(html, /id="sceneCount"/);
  assert.match(moduleSource, /\$\('sceneSearch'\)\.addEventListener\('input',render\)/);
  assert.match(moduleSource, /data-edit-scene=/);
  assert.match(moduleSource, /Object\.assign\(existing,values\)/);
  assert.match(moduleSource, /selectedSceneProject/);
});
