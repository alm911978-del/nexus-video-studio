# NEXUS VIDEO 5.0 — Security Policy

**Status:** Active baseline for the static site + Cloudflare Worker + optional FastAPI engine.  
This document is the source of truth for what is protected and what remains the operator’s responsibility.

---

## 1. Threat model (honest)

| Asset | Risk | Current controls |
|-------|------|------------------|
| Provider API keys | Leakage via frontend or git | Keys only in Cloudflare Worker secrets / server env. Never in `index.html`, JS bundles, or commits. |
| User project data | Browser XSS / theft | Data lives in `localStorage` / isolated keys. No cloud sync yet. Sanitize before render. |
| Worker endpoint | Abuse, cost, scraping | Origin allowlist, Turnstile, body size limit, prompt length limit, daily IP rate limit via KV. |
| Uploaded media (engine) | Malware, path traversal, command injection | Extension allowlist, size cap (500 MB), FFmpeg via fixed argument arrays (no shell). |
| GitHub Actions | Supply-chain | Pin actions where possible; no secrets in workflow logs. |
| GitHub Pages origin | Clickjacking, mixed content | Recommend CSP + frame-ancestors + HTTPS only. |

We do **not** claim the site is “unhackable”. We claim layered, auditable defenses and clear failure modes.

---

## 2. Non-negotiable rules

1. **No secrets in the repository or frontend.**  
2. **No `eval`, `new Function`, or dynamic script injection from user content.**  
3. **No shell interpolation of user input** (FFmpeg, paths, URLs).  
4. **Provider keys stay server-side.** Worker or FastAPI only.  
5. **All external asset URLs must be absolute `https://` without credentials.**  
6. **Rate limits and Turnstile are required before public exposure of the Worker.**  
7. **Draft PRs only until tests pass; never force-push `main`.**  

---

## 3. Static site (GitHub Pages)

Recommended HTTP headers (set via Cloudflare Pages / custom domain, or meta where possible):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.workers.dev https://*.supabase.co https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Notes:
- `'unsafe-inline'` is currently required by the single-page architecture. Long-term goal: move scripts to external modules with nonces/hashes.
- Tighten `connect-src` to the exact Worker hostname after deploy.
- Never put API keys in meta tags or localStorage.

Client-side helpers live under `src/nexus/security/` (sanitization, URL checks).

---

## 4. Cloudflare Worker gateway

Existing controls (must remain enabled):

- Exact `Origin` / `ALLOWED_ORIGINS` allowlist  
- POST-only generation endpoint  
- JSON content-type enforcement  
- Max body ~20 KB, max prompt 12 000 characters  
- Turnstile server-side verification  
- Daily per-IP counter via KV  
- Fixed provider endpoints and models (client cannot pick arbitrary URLs)  
- Upstream timeout, no-store responses, no prompt/key logging  

Operator checklist before public traffic:
1. Deploy Worker with secrets via `wrangler secret put` only.  
2. Set real `ALLOWED_ORIGINS` and Turnstile hostname.  
3. Confirm KV namespace binding.  
4. Run `npm test` inside `worker/`.  
5. Monitor Cloudflare analytics for spike abuse.

---

## 5. FastAPI engine (`engine/`)

- Generation returns **503** until a real provider is configured.  
- Audio mux uses argument arrays only (no shell).  
- Upload size capped; extension allowlists for video/audio.  
- Temporary workdirs cleaned with background tasks.  
- Do not expose an unauthenticated ComfyUI instance to the internet.  
- Run behind reverse proxy with TLS; add auth before any public exposure.

---

## 6. Reporting a vulnerability

If you find a security issue:

1. **Do not** open a public GitHub issue with exploit details.  
2. Contact the repository owner privately.  
3. Include steps to reproduce, impact, and (if possible) a minimal fix suggestion.  

We will acknowledge and prioritize fixes that affect secrets, RCE, or data theft.

---

## 7. Status vocabulary

| Control | Current status |
|---------|----------------|
| Server-side secrets | IMPLEMENTED (design) |
| Origin + Turnstile + rate limit | IMPLEMENTED (Worker code) — LIVE_VERIFIED only after your deploy |
| Client sanitization helpers | IMPLEMENTED on this branch |
| CSP headers | DOCUMENTED — apply at CDN/Pages |
| Engine path safety | IMPLEMENTED |
| Full penetration test | NOT DONE (requires external review) |

Last updated: 2026-10-25 — Grok / NEXUS Ω ULTRA
