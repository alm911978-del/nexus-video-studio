# NEXUS Gemini Gateway

Cloudflare Worker proxy for NEXUS VIDEO → Gemini. The Gemini API key stays in a server-side secret, never in the static website.

## Requirements
- Free Cloudflare account (subject to current plan and quota).
- Gemini API key with API access enabled.
- Cloudflare Turnstile site key + secret key for hostname `alm911978-del.github.io`.
- Cloudflare KV namespace for rate-limit counters.
- Node.js + npm, and Wrangler CLI (or `npx wrangler`).

## Configure
1. In Cloudflare dashboard, create a Turnstile widget allowing hostname `alm911978-del.github.io`. Copy its **site key** and **secret key**.
2. Create a KV namespace named `RATE_LIMITS`.
3. Edit `wrangler.toml`: replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with the new namespace ID. Keep `ALLOWED_ORIGINS` restricted to the exact published origin. The hostname in `TURNSTILE_HOSTNAME` must match the Turnstile result hostname.
4. From this directory run:

```bash
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npm test
npx wrangler deploy
```

When prompted for each secret, paste it only into the terminal prompt. Do not put it in a source file, commit, screenshot, or chat. `.dev.vars*` and `.env*` are ignored by Git.

5. Copy the deployed Worker URL (for example `https://nexus-gemini-gateway.<your-subdomain>.workers.dev`).
6. Open the NEXUS site → **كاتب المسلسلات** → **إعداد اتصال Gemini الآمن**. Enter the Worker URL and the public Turnstile site key, save, then run the connection test.
7. Complete Turnstile and click **توليد بالذكاء الاصطناعي**.

## Endpoints
- `GET /api/health`: public health metadata, no secrets.
- `POST /api/generate`: accepts `{ "action": "series|episode|continuity|scene-prompt", "prompt": "...", "turnstileToken": "..." }`.
- The model is fixed server-side to `gemini-3.8-flash`; client input cannot choose arbitrary URLs or models.

## Security controls
- Exact Origin allowlist; CORS preflight handling.
- POST-only generation endpoint and JSON content-type enforcement.
- 20 KB maximum body and 12,000-character prompt limit.
- Turnstile server-side verification and optional hostname check.
- Daily IP-based request cap using KV (best-effort; simultaneous requests may race).
- Server-only Gemini secret; fixed model and fixed task system instructions.
- Upstream timeout, no-store responses, generic upstream errors, no prompt/key logging.
- Rejects requests if required secrets or KV binding are missing.

CORS is not authentication by itself. Turnstile and rate limiting reduce abuse but do not guarantee immunity from attacks. For a larger public deployment, add user authentication, durable atomic rate limiting, usage monitoring, and budget/quota alerts.

## Local tests
`npm test` runs Node's built-in test runner. These tests validate routing and input/security behavior without calling Gemini or requiring real secrets. A successful unit test does not prove that a live Cloudflare deployment or Gemini quota is working.
