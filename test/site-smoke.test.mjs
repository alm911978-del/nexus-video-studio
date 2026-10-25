import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker/src/index.js", import.meta.url), "utf8");

test("site declares Arabic RTL layout and mobile viewport", () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /name="viewport"/);
});

test("core studio areas remain present", () => {
  for (const id of ["projects", "writer", "assistant", "characters", "scenes", "backup", "media", "engine"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test("site keeps video-generation limitations transparent", () => {
  assert.match(html, /توليد الفيديو والصوت ومزامنة الشفاه غير موصولة/);
});

test("gateway keeps provider secrets server-side and validates origin", () => {
  assert.match(worker, /ALLOWED_ORIGINS/);
  assert.match(worker, /TURNSTILE_SECRET_KEY/);
  assert.match(worker, /GEMINI_API_KEY/);
  assert.match(worker, /Origin not allowed/);
});
