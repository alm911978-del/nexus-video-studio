/**
 * Modular SPA UI regression — does not require monolithic index.html.
 * Run: node --test worker/test/spa-ui.regression.test.js
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

test("SPA shell: ar/rtl, module entry, no embedded Google API keys", () => {
  const html = read("../../index.html");
  const appUi = read("../../src/nexus/app-ui.js");
  assert.match(html, /lang="ar"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /<title>NEXUS VIDEO 5\.0/);
  assert.match(html, /src="\.\/src\/nexus\/app-ui\.js"/);
  assert.doesNotMatch(html, /\bAIza[0-9A-Za-z_-]{35}\b/);
  assert.doesNotMatch(appUi, /\bAIza[0-9A-Za-z_-]{35}\b/);
});

test("local workspace without account", () => {
  const appUi = read("../../src/nexus/app-ui.js");
  assert.match(appUi, /authLocalMode/);
  assert.match(appUi, /nexus-video-50-local-v4/);
  assert.match(appUi, /المتابعة محليًا بدون حساب/);
});

test("reference library local-only honesty", () => {
  const appUi = read("../../src/nexus/app-ui.js");
  const lib = read("../../src/nexus/reference-library.js");
  assert.match(appUi, /id="references"/);
  assert.match(appUi, /refImageFiles/);
  assert.match(appUi, /refVideoFiles/);
  assert.match(lib, /MAX_IMAGES/);
  assert.match(lib, /persisted: false/);
});

test("prototype 0.4 label and honest engine status", () => {
  const appUi = read("../../src/nexus/app-ui.js");
  assert.match(appUi, /Prototype 0\.4 · محلي · آمن/);
  assert.match(appUi, /VIDEO_ENGINE_NOT_CONFIGURED/);
});

test("media lab local preview only", () => {
  const appUi = read("../../src/nexus/app-ui.js");
  assert.match(appUi, /id="mediaFiles"/);
  assert.match(appUi, /URL\.createObjectURL/);
  assert.match(appUi, /معاينة محلية فقط/);
});
