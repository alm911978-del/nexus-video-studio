import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../hybrid.html", import.meta.url), "utf8");
const script = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(match => match[1]).join("\\n");

test("hybrid router inline JavaScript parses", () => {
  assert.ok(script.length > 0, "expected hybrid router script");
  assert.doesNotThrow(() => new Function(script));
});

test("HYBRID LAB has unique static IDs and a studio navigation link", () => {
  const ids = [...html.matchAll(/\\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate HTML IDs found");
  assert.match(html, /href="\\.\\/hybrid\\.html"/);
});

test("local endpoint validation allows loopback only and requires /v1", () => {
  const match = script.match(/function validateLocalBase\\(v\\)\\{[\\s\\S]*?\\nfunction loadRoute\\(\\)/);
  assert.ok(match, "local endpoint validator not found");
  const functionSource = match[0].replace(/\\nfunction loadRoute\\([\\s\\S]*$/, "");
  const validate = new Function("normalizeBase", "return (" + functionSource + ")")(
    value => String(value || "").trim().replace(/\\/+$/, "")
  );
  assert.equal(validate("http://127.0.0.1:3001/v1"), "http://127.0.0.1:3001/v1");
  assert.equal(validate("http://localhost:3001/v1"), "http://localhost:3001/v1");
  assert.throws(() => validate("https://example.com/v1"), /عنوان المحرك محليًا/);
  assert.throws(() => validate("http://127.0.0.1:3001"), /ينتهي المسار بـ \/v1/);
  assert.throws(() => validate("http://user:pass@127.0.0.1:3001/v1"), /بيانات الدخول/);
  assert.throws(() => validate("http://127.0.0.1:3001/v1?token=x"), /query\/hash/);
});

test("local bearer key is never persisted and is sent only to local chat", () => {
  assert.doesNotMatch(script, /localStorage\\.setItem\\([^\\n]*localKey/);
  assert.match(script, /Authorization:"Bearer "\\+localKey/);
  assert.match(script, /base\+"\\/chat\\/completions"/);
  assert.doesNotMatch(script, /turnstileToken:cloudToken[^}]*localKey/);
});

test("cloud fallback is opt-in and cloud requests require Turnstile", () => {
  assert.match(script, /if\\(mode==="auto"&&fallback\\)/);
  assert.match(script, /if\\(!cloudToken\\)throw Error/);
  assert.match(script, /turnstileToken:cloudToken/);
  assert.match(html, /id="cloudFallback" type="checkbox"/);
});

test("chat output uses textContent rather than HTML injection", () => {
  assert.match(script, /body\\.textContent=text/);
  assert.match(script, /replaceChildren\\(\\)/);
});
