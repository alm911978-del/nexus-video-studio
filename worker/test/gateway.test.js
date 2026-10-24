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
  assert.deepEqual(body.providers, ["gemini", "groq", "openrouter", "mistral"]);
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

test("rejects unknown LLM providers without calling external services", async () => {
  const res = await worker.fetch(req("/api/generate", {
    method: "POST",
    body: JSON.stringify({ action: "general", provider: "arbitrary-url", prompt: "test" }),
    headers: { "content-type": "application/json" }
  }), env);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Unsupported provider/);
});

test("returns a clear setup error when a selected provider secret is missing", async () => {
  const res = await worker.fetch(req("/api/generate", {
    method: "POST",
    body: JSON.stringify({ action: "general", provider: "groq", prompt: "test" }),
    headers: { "content-type": "application/json" }
  }), { ...env, GROQ_API_KEY: undefined });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /not configured/);
});

test("fails closed if required secrets or rate-limit binding are missing", async () => {
  const res = await worker.fetch(req("/api/generate", { method: "POST", body: JSON.stringify({ action: "series", prompt: "test" }), headers: { "content-type": "application/json" } }), { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS });
  assert.equal(res.status, 503);
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

test("Gemini 3.8 generation request uses supported parameters and returns model text", async () => {
  const originalFetch = globalThis.fetch;
  const upstreamCalls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    upstreamCalls.push(target);
    if (target.includes("challenges.cloudflare.com/turnstile/v0/siteverify")) {
      return new Response(JSON.stringify({ success: true, hostname: "alm911978-del.github.io" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    if (target.includes("generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent")) {
      const payload = JSON.parse(options.body);
      assert.equal(payload.generationConfig.maxOutputTokens, 8192);
      assert.equal(Object.hasOwn(payload.generationConfig, "temperature"), false);
      assert.equal(Object.hasOwn(payload.generationConfig, "topP"), false);
      assert.equal(options.headers["x-goog-api-key"], "fake-test-key");
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "NEXUS_TEST_OK" }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 }
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected outbound request");
  };
  try {
    const res = await worker.fetch(req("/api/generate", {
      method: "POST",
      body: JSON.stringify({ action: "series", prompt: "test", turnstileToken: "valid-token" }),
      headers: { "content-type": "application/json" }
    }), env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.model, "gemini-3.8-flash");
    assert.equal(body.text, "NEXUS_TEST_OK");
    assert.equal(upstreamCalls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("general assistant action is accepted by the secure gateway", async () => {
  const originalFetch = globalThis.fetch;
  let capturedSystem = "";
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes("challenges.cloudflare.com/turnstile/v0/siteverify")) {
      return new Response(JSON.stringify({ success: true, hostname: "alm911978-del.github.io" }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }
    if (target.includes("generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent")) {
      const payload = JSON.parse(options.body);
      capturedSystem = payload.systemInstruction.parts[0].text;
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "GENERAL_ASSISTANT_OK" }] } }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("Unexpected outbound request");
  };
  try {
    const res = await worker.fetch(req("/api/generate", {
      method: "POST",
      body: JSON.stringify({ action: "general", prompt: "اشرح لي مفهومًا", turnstileToken: "valid-token" }),
      headers: { "content-type": "application/json" }
    }), env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.text, "GENERAL_ASSISTANT_OK");
    assert.match(capturedSystem, /مساعد عام متعدد المجالات/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("NEXUS visual layer ships the brand assets", () => {
  const i18n = readFileSync(new URL("../../i18n.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../assets/nexus-brand.css", import.meta.url), "utf8");
  const svg = readFileSync(new URL("../../assets/nexus-mark.svg", import.meta.url), "utf8");
  new Script(i18n);
  assert.match(i18n, /nexus-mark\.svg/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(svg, /<svg[\s\S]*NEXUS VIDEO/);
});
