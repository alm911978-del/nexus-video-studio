import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const env = {
  ALLOWED_ORIGINS: "https://alm911978-del.github.io",
  TURNSTILE_HOSTNAME: "alm911978-del.github.io",
  GEMINI_API_KEY: "fake-test-key",
  TURNSTILE_SECRET_KEY: "fake-test-secret",
  RATE_LIMITS: { get: async () => "0", put: async () => {} }
};
const req = (path, options = {}) => new Request("https://worker.example" + path, {
  ...options,
  headers: { Origin: "https://alm911978-del.github.io", ...(options.headers || {}) }
});

test("health reports service metadata without exposing secrets", async () => {
  const res = await worker.fetch(req("/api/health"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.model, "gemini-3.8-flash");
  assert.equal(JSON.stringify(body).includes("fake-test-key"), false);
});

test("rejects unapproved origin", async () => {
  const res = await worker.fetch(new Request("https://worker.example/api/health", {
    headers: { Origin: "https://evil.example" }
  }), env);
  assert.equal(res.status, 403);
});

test("rejects unsupported route", async () => {
  const res = await worker.fetch(req("/unknown"), env);
  assert.equal(res.status, 404);
});

test("rejects wrong content type before external calls", async () => {
  const res = await worker.fetch(req("/api/generate", { method: "POST", body: "{}", headers: { "content-type": "text/plain" } }), env);
  assert.equal(res.status, 415);
});

test("rejects malformed JSON", async () => {
  const res = await worker.fetch(req("/api/generate", { method: "POST", body: "{", headers: { "content-type": "application/json" } }), env);
  assert.equal(res.status, 400);
});

test("rejects unsupported action", async () => {
  const res = await worker.fetch(req("/api/generate", { method: "POST", body: JSON.stringify({ action: "arbitrary", prompt: "test" }), headers: { "content-type": "application/json" } }), env);
  assert.equal(res.status, 400);
});

test("fails closed if required secrets or rate-limit binding are missing", async () => {
  const res = await worker.fetch(req("/api/generate", { method: "POST", body: JSON.stringify({ action: "series", prompt: "test" }), headers: { "content-type": "application/json" } }), { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS });
  assert.equal(res.status, 503);
});

test("published HTML inline JavaScript parses and includes secure Gemini controls", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  assert.ok(inlineScripts.length > 0, "expected an inline application script");
  for (const source of inlineScripts) {
    // The browser entrypoint is a module; strip its static import for Node's classic Script parser.
    const parseableSource = source.replace(/^\s*import\s+\{[^}]+\}\s+from\s+["'][^"']+["'];\s*/m, "");
    new Script(parseableSource);
  }
  assert.match(html, /import \{ normalizeDatabase \} from ["']\.\/src\/nexus\/backup-schema\.js["']/);
  const backupSchemaPath = fileURLToPath(new URL("../../src/nexus/backup-schema.js", import.meta.url));
  assert.doesNotThrow(() => readFileSync(backupSchemaPath, "utf8"));
  assert.match(html, /id="generateGemini"/);
  assert.match(html, /id="turnstileWidget"/);
  assert.match(html, /api\/generate/);
  assert.doesNotMatch(html, /\bAIza[0-9A-Za-z_-]{35}\b/, "do not embed a Google API key in public HTML");
});

test("answers CORS preflight only for the configured origin", async () => {
  const good = await worker.fetch(req("/api/generate", { method: "OPTIONS" }), env);
  assert.equal(good.status, 204);
  const bad = await worker.fetch(new Request("https://worker.example/api/generate", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example" }
  }), env);
  assert.equal(bad.status, 403);
});

test("rejects oversized generation payloads", async () => {
  const body = JSON.stringify({ action: "series", prompt: "x".repeat(21_000), turnstileToken: "test" });
  const res = await worker.fetch(req("/api/generate", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" }
  }), env);
  assert.equal(res.status, 413);
});

test("accepts scene-prompt action and returns Gemini text only after Turnstile succeeds", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0, requestedUrl = "", sentBody = null;
  globalThis.fetch = async (url, options = {}) => {
    calls += 1;
    if (String(url).includes("challenges.cloudflare.com/turnstile/v0/siteverify")) {
      return new Response(JSON.stringify({ success: true, hostname: "alm911978-del.github.io" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    requestedUrl = String(url);
    sentBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "A cinematic scene prompt." }] } }],
      usageMetadata: { totalTokenCount: 20 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const res = await worker.fetch(req("/api/generate", {
      method: "POST",
      body: JSON.stringify({ action: "scene-prompt", prompt: "A young man enters an Arabian desert.", turnstileToken: "valid-token" }),
      headers: { "content-type": "application/json" }
    }), env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.text, "A cinematic scene prompt.");
    assert.equal(body.model, "gemini-3.8-flash");
    assert.match(requestedUrl, /generativelanguage\.googleapis\.com/);
    assert.match(requestedUrl, /gemini-3\.8-flash:generateContent/);
    assert.match(sentBody.systemInstruction.parts[0].text, /Prompt سينمائي عملي/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("enforces daily IP rate limit after successful Turnstile verification", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: "alm911978-del.github.io" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const limitedEnv = {
      ...env,
      RATE_LIMITS: { get: async () => "30", put: async () => { throw new Error("should not write over limit"); } }
    };
    const res = await worker.fetch(req("/api/generate", {
      method: "POST",
      body: JSON.stringify({ action: "series", prompt: "test", turnstileToken: "valid-token" }),
      headers: { "content-type": "application/json" }
    }), limitedEnv);
    assert.equal(res.status, 429);
    assert.match((await res.json()).error, /Daily request limit/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
