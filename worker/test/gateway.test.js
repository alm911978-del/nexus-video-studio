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

test("NEXUS Ω dashboard states capability boundaries without claiming connected engines", () => {
  const scriptPath = fileURLToPath(new URL("../../i18n.js", import.meta.url));
  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /خارطة القدرات والتوصيلات/);
  assert.match(source, /الأدوات المتصلة بحساب ChatGPT لا تصبح تلقائيًا جزءًا من الموقع/);
  assert.match(source, /الموقع لا يولّد مقطعًا حقيقيًا حاليًا/);
  assert.match(source, /لا يوجد مشروع Supabase متصل حاليًا/);
  assert.match(source, /اتصال GitHub في ChatGPT لا يمنح صفحة الويب صلاحية مباشرة/);
});

test("published HTML inline JavaScript parses and includes secure Gemini controls", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  assert.ok(inlineScripts.length > 0, "expected an inline application script");
  for (const source of inlineScripts) new Script(source);
  assert.match(html, /id="generateGemini"/);
  assert.match(html, /id="llmProvider"/);
  assert.match(html, /provider:geminiSettings.provider/);
  assert.match(html, /id="assistantMessages"/);
  assert.match(html, /id="assistantSend"/);
  assert.match(html, /action:'general'/);
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

test("static media lab exposes local-only media inspection and SRT export controls", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /id="mediaFiles"[^>]*accept="image\/\*,video\/\*,audio\/\*"/);
  assert.match(html, /id="mediaResults"/);
  assert.match(html, /id="exportMediaReport"/);
  assert.match(html, /id="subtitleLines"/);
  assert.match(html, /id="makeSrt"/);
  assert.match(html, /id="downloadSrt"/);
  assert.match(html, /URL\.createObjectURL\(file\)/);
  assert.match(html, /processing:'local-browser-only',uploaded:false/);
  assert.match(html, /function srtTime\(seconds\)/);
});

test("backup import validates record shapes and rendered IDs are HTML-escaped", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  assert.ok(html.includes(`data-id="'+esc(p.id)+'"`));
  assert.ok(html.includes(`data-id="'+esc(c.id)+'"`));
  assert.ok(html.includes(`data-copy="'+esc(s.id)+'"`));
  assert.ok(html.includes(`<option value="'+esc(p.id)+'"`));
  assert.match(html, /function validBackupRecord\(/);
  assert.match(html, /function validBackup\(x\)/);
  assert.match(html, /item\.id\.length<=128/);
  assert.match(html, /لم يتم استبدال بياناتك/);
});

test("unconfigured Supabase still permits a browser-local workspace without an account", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /id="authLocalMode"/);
  assert.match(html, /function loadLocalDB\(/);
  assert.match(html, /nexus-video-50-local-data/);
  assert.match(html, /localMode=true/);
  assert.match(html, /const save=\(\)=>\{try\{if\(!KEY\)return;/);
  assert.match(html, /الوضع المحلي مجاني ولا يحتاج إلى حساب/);
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

test("multimodal scene lab exposes reference inputs and honest local-only export", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  assert.ok(html.includes('id="scenePackLab"'));
  assert.ok(html.includes('id="sceneRefImages"'));
  assert.ok(html.includes('accept="image/*" multiple'));
  assert.ok(html.includes('id="sceneRefAudio"'));
  assert.ok(html.includes('accept="audio/*"'));
  assert.ok(html.includes('id="scenePackPrompt"'));
  assert.ok(html.includes('id="buildScenePack"'));
  assert.ok(html.includes('id="downloadScenePack"'));
  assert.ok(html.includes('generationStatus:\'prompt_package_only_not_generated\''));
  assert.ok(html.includes("لا تُرفع الملفات ولا يتم توليد فيديو تلقائيًا."));
  assert.ok(html.includes("window.addEventListener('beforeunload',clearScenePackUrls)"));
});

test("NEXUS prototype version labels are consistent", () => {
  const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");
  assert.ok(html.includes("<title>NEXUS VIDEO 5.0 — الاستوديو</title>"));
  assert.ok(html.includes("Prototype 0.3 · محلي"));
  assert.ok(html.includes("نسخة تجريبية 0.3"));
  assert.ok(!html.includes("Prototype 0.2") && !html.includes("نسخة تجريبية 0.1"));
});

test("NEXUS visual layer ships the brand assets, dashboard, and honest backend status", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const i18n = readFileSync(new URL("../../i18n.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../assets/nexus-brand.css", import.meta.url), "utf8");
  const svg = readFileSync(new URL("../../assets/nexus-mark.svg", import.meta.url), "utf8");
  new Script(i18n);
  assert.match(i18n, /nexus-mark\.svg/);
  assert.match(i18n, /nexus-brand\.css/);
  assert.match(i18n, /nexus-run-audit/);
  assert.match(i18n, /nexus-community/);
  assert.match(i18n, /لا يوجد مشروع Supabase متصل/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(svg, /<svg[\s\S]*NEXUS VIDEO/);
});
