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

test("HTML escape helper encodes markup and attribute delimiters", () => {
  const escapeSource = html.match(/^function esc\(s=''\)\{[^\n]+\}/m);
  assert.ok(escapeSource, "expected the shared HTML escape helper");
  const escapeHtml = new Function(`${escapeSource[0]}; return esc;`)();
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
  assert.equal(escapeHtml(`' " & < >`), "&#39; &quot; &amp; &lt; &gt;");
});

test("stored project, character, and scene fields are escaped before HTML insertion", () => {
  const escapeSource = html.match(/^function esc\(s=''\)\{[^\n]+\}/m);
  const renderSource = html.match(/function render\(\)\{([\s\S]*?)\n\}/);
  assert.ok(escapeSource, "expected the shared HTML escape helper");
  assert.ok(renderSource, "expected the studio render function");

  const escapeHtml = new Function(`${escapeSource[0]}; return esc;`)();
  const payload = '<img src=x onerror="alert(1)">';
  const hostileId = '" onfocus="alert(1)';
  const db = {
    projects: [{ id: hostileId, name: payload, ratio: payload, style: payload, summary: payload }],
    characters: [{ id: hostileId, name: payload, desc: payload }],
    scenes: [{
      id: hostileId,
      name: payload,
      project: hostileId,
      character: hostileId,
      prompt: payload
    }]
  };
  const nodes = Object.create(null);
  const $ = id => (nodes[id] ||= { innerHTML: "" });
  const render = new Function(
    "$", "db", "esc", "empty",
    `return function render(){${renderSource[1]}}`
  )($, db, escapeHtml, () => '<div class="empty"></div>');

  render();

  const output = ["projectList", "characterList", "sceneList", "sProject", "sCharacter"]
    .map(id => nodes[id].innerHTML)
    .join("\n");

  assert.ok(output.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
  assert.equal(output.includes(payload), false, "raw hostile markup must not reach innerHTML");
  assert.equal(output.includes("<img src=x"), false, "raw image elements must not be injected");
  assert.equal(output.includes('onfocus="alert(1)'), false, "attribute quotes must remain escaped");
  assert.match(output, /data-id="&quot; onfocus=&quot;alert\(1\)"/);
});
