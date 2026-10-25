/**
 * NEXUS Ω additive contract checks for main (001–300 verification).
 * Does not replace gateway or site-diagnostics suites.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker/src/index.js", import.meta.url), "utf8");

test("no embedded Google API key patterns in published sources", () => {
  for (const [name, src] of [["index.html", html], ["i18n.js", i18n], ["worker", worker]]) {
    assert.doesNotMatch(src, /\bAIza[0-9A-Za-z_-]{35}\b/, name);
    assert.doesNotMatch(src, /\bsk-[a-zA-Z0-9]{20,}\b/, name);
  }
});

test("HTML declares Arabic RTL and viewport", () => {
  assert.match(html, /lang="ar"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /viewport-fit=cover|width=device-width/);
});

test("core workspace pages exist", () => {
  for (const id of ["projects", "writer", "assistant", "characters", "scenes", "backup", "media", "engine"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("local auth path and backup controls exist", () => {
  assert.match(html, /id="authLocalMode"/);
  assert.match(html, /id="exportData"/);
  assert.match(html, /id="importFile"/);
  assert.match(html, /function validBackup/);
});

test("honest non-generation markers present", () => {
  assert.match(html, /prompt_package_only_not_generated|لا تُرفع الملفات/);
  assert.match(i18n, /إعداد البرومبت لا يعني أن فيديو|غير موصول|لا نعلن نجاح/);
});

test("worker fails closed without secrets (static contract)", () => {
  assert.match(worker, /503|not configured|RATE_LIMITS|TURNSTILE|ALLOWED_ORIGINS/);
  assert.match(worker, /api\/generate/);
});

test("inline application script still parses", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .filter((s) => s.trim());
  assert.ok(scripts.length > 0);
  for (const s of scripts) new Script(s);
  new Script(i18n);
});
