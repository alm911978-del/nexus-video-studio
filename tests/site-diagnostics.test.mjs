import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const i18n = await readFile(new URL("../i18n.js", import.meta.url), "utf8");

test("main inline application script parses as JavaScript", () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.ok(scripts.length >= 1, "expected the main inline script");
  for (const source of scripts) assert.doesNotThrow(() => new Function(source));
});

test("language and visual enhancement script parses as JavaScript", () => {
  assert.doesNotThrow(() => new Function(i18n));
});

test("static HTML IDs are unique", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("each static navigation page points to a page section", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const pageTargets = [...html.matchAll(/data-page="([^"]+)"/g)].map(match => match[1]);
  assert.ok(pageTargets.length > 0);
  for (const target of pageTargets) assert.ok(ids.has(target), "missing section for nav target: " + target);
});

test("system dashboard exposes local diagnostics and report actions", () => {
  assert.match(i18n, /id="nexus-run-audit"/);
  assert.match(i18n, /id="nexus-copy-audit"/);
  assert.match(i18n, /id="nexus-download-audit"/);
  assert.match(i18n, /id="nexus-audit-results"/);
  assert.match(i18n, /function runAudit\(/);
  assert.match(i18n, /lastAuditReport/);
});

test("diagnostics distinguish optional integrations from actual media generation", () => {
  assert.match(i18n, /غير مهيأ/);
  assert.match(i18n, /لم يتم اختبار توليد فيديو أو صوت فعلي/);
  assert.match(i18n, /لا يتصل بخدمات خارجية/);
  assert.match(i18n, /navigator\.clipboard/);
  assert.match(i18n, /URL\.createObjectURL/);
});

test("diagnostic UI inserts result text safely instead of rendering it as HTML", () => {
  assert.match(i18n, /strong\.textContent/);
  assert.match(i18n, /note\.textContent/);
  assert.match(i18n, /out\.replaceChildren\(\)/);
});
test("diagnostics controls have translations for supported languages", () => {
  assert.match(i18n, /'تشغيل الفحص المحلي':'Run local diagnostics'/);
  assert.match(i18n, /'نسخ تقرير الفحص':'Copier le rapport de diagnostic'/);
  assert.match(i18n, /'تنزيل تقرير JSON':'Descargar informe JSON'/);
});

