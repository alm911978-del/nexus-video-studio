# Deploy NEXUS AI Gateway (Cloudflare Worker)

Checklist to go from source code to a live, secure LLM gateway.

## Prerequisites

- Free Cloudflare account
- At least one provider API key (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, or `MISTRAL_API_KEY`)
- Cloudflare Turnstile widget for hostname `alm911978-del.github.io`
- KV namespace (already referenced in `wrangler.toml` as `RATE_LIMITS`)

## Option A — Deploy from your machine (recommended first time)

```bash
cd worker
npm install
npx wrangler login

# Put secrets (paste when prompted — never commit them)
npx wrangler secret put GEMINI_API_KEY          # or the provider you use
npx wrangler secret put TURNSTILE_SECRET_KEY
# optional:
# npx wrangler secret put GROQ_API_KEY
# npx wrangler secret put OPENROUTER_API_KEY
# npx wrangler secret put MISTRAL_API_KEY

npm test
npx wrangler deploy
```

Copy the Worker URL (e.g. `https://nexus-gemini-gateway.<subdomain>.workers.dev`).

## Option B — Deploy from GitHub Actions

1. In the repository: **Settings → Secrets and variables → Actions**
2. Add:
   - `CLOUDFLARE_API_TOKEN` (Workers Edit permission)
   - `CLOUDFLARE_ACCOUNT_ID`
3. Open **Actions → Deploy Cloudflare Worker → Run workflow**

Secrets for the LLM providers and Turnstile must still be set with `wrangler secret put` (or Cloudflare dashboard) — GitHub Actions does not store those provider keys in this workflow on purpose.

## After deploy — connect the website

1. Open the live site → **كاتب المسلسلات** → **إعداد اتصال Gemini الآمن**
2. Enter:
   - Worker URL
   - Turnstile **Site Key** (public)
3. Choose provider → Save → Run connection test → Generate

## Verify

```bash
curl -s https://YOUR-WORKER.workers.dev/api/health
```

Then perform one real generation from the UI and update `TOOLS.md` status to `connected_needs_test` or `verified` with the date.

## Security reminders

- Never put provider keys or Turnstile secret in `index.html` or GitHub.
- Keep `ALLOWED_ORIGINS` restricted to the Pages origin.
- Review daily rate limits in the Worker if traffic grows.
