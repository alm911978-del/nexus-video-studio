/**
 * Security & job-model unit tests — no network, no secrets.
 * node --test tests/nexus-security.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  stripControlChars,
  sanitizeText,
  sanitizeId,
  escapeHtml,
  sanitizeHref,
  assertSafeHttpsAssetUrl,
  isAllowedOrigin,
  buildContentSecurityPolicy,
  SECURITY_HEADERS
} from "../src/nexus/security/index.js";

import {
  JOB_STATUS,
  createJob,
  transitionJob,
  isTerminal,
  jobSummary
} from "../src/nexus/jobs/job-model.js";

describe("sanitize", () => {
  it("strips control characters", () => {
    assert.equal(stripControlChars("a\u0000b\u0007c"), "a b c");
  });
  it("bounds text length", () => {
    const long = "x".repeat(100);
    assert.equal(sanitizeText(long, 10).length, 10);
  });
  it("sanitizes ids", () => {
    assert.equal(sanitizeId("ab<>cd!"), "abcd");
    assert.ok(sanitizeId("مشهد_1").length > 0);
  });
  it("escapes HTML", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  });
  it("blocks dangerous href schemes", () => {
    assert.equal(sanitizeHref("javascript:alert(1)"), "");
    assert.equal(sanitizeHref("data:text/html,x"), "");
    assert.equal(sanitizeHref("https://example.com"), "https://example.com");
  });
});

describe("url-policy", () => {
  it("accepts clean https asset urls", () => {
    const r = assertSafeHttpsAssetUrl("https://cdn.example.com/v/out.mp4");
    assert.equal(r.ok, true);
  });
  it("rejects http, credentials, localhost, and control chars", () => {
    assert.equal(assertSafeHttpsAssetUrl("http://example.com/a").ok, false);
    assert.equal(assertSafeHttpsAssetUrl("https://user:pass@example.com/a").ok, false);
    assert.equal(assertSafeHttpsAssetUrl("https://127.0.0.1/a").ok, false);
    assert.equal(assertSafeHttpsAssetUrl("https://example.com/a\u0000").ok, false);
  });
  it("checks origin allowlist", () => {
    assert.equal(isAllowedOrigin("https://alm911978-del.github.io", ["https://alm911978-del.github.io"]), true);
    assert.equal(isAllowedOrigin("https://evil.example", ["https://alm911978-del.github.io"]), false);
  });
});

describe("headers", () => {
  it("builds CSP containing frame-ancestors none", () => {
    const csp = buildContentSecurityPolicy();
    assert.ok(csp.includes("frame-ancestors 'none'"));
    assert.ok(csp.includes("object-src 'none'"));
  });
  it("exposes core security headers map", () => {
    assert.equal(SECURITY_HEADERS["X-Frame-Options"], "DENY");
  });
});

describe("job-model", () => {
  it("creates queued job", () => {
    const j = createJob({ id: "job-1", type: "scene-prompt" });
    assert.equal(j.status, JOB_STATUS.QUEUED);
    assert.equal(isTerminal(j.status), false);
  });
  it("transitions to succeeded with result", () => {
    const j = createJob({ id: "job-2", type: "series" });
    const r = transitionJob(j, JOB_STATUS.SUCCEEDED, { result: { text: "ok" } });
    assert.equal(r.ok, true);
    assert.equal(j.status, JOB_STATUS.SUCCEEDED);
    assert.equal(isTerminal(j.status), true);
  });
  it("blocks transition out of terminal state", () => {
    const j = createJob({ id: "job-3", type: "series" });
    transitionJob(j, JOB_STATUS.FAILED, { errorCode: "X" });
    const r = transitionJob(j, JOB_STATUS.RUNNING);
    assert.equal(r.ok, false);
    assert.equal(r.code, "ALREADY_TERMINAL");
  });
  it("supports not_configured status", () => {
    const j = createJob({ id: "job-4", type: "image-to-video" });
    transitionJob(j, JOB_STATUS.NOT_CONFIGURED, {
      errorCode: "VIDEO_ENGINE_NOT_CONFIGURED",
      errorMessage: "No provider configured"
    });
    assert.equal(j.status, JOB_STATUS.NOT_CONFIGURED);
    const s = jobSummary(j);
    assert.equal(s.errorCode, "VIDEO_ENGINE_NOT_CONFIGURED");
  });
});
