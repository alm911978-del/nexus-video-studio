# NEXUS Ω Orchestrator Foundation

This branch adds a small, dependency-free orchestration foundation under `src/nexus/`.

## Modules
- `task-registry.js`: task IDs aligned with the current Cloudflare gateway actions.
- `model-router.js`: chooses an explicitly enabled provider adapter based on declared capabilities and priority.
- `project-context.js`: normalizes bounded project facts, preferences, and notes.
- `result-validator.js`: validates that a provider returned non-empty text within the display limit.
- `orchestrator.js`: validates input, routes the task, calls an injected adapter, and returns a transparent status object.

## Current integration status
These modules are not yet imported by `index.html` and do not call Cloudflare or Gemini directly. This is deliberate: the existing page currently uses inline application code and the gateway must be deployed and verified separately before changing the live UI.

A future adapter can call the existing endpoint `POST /api/generate` with one of the supported actions: `series`, `episode`, `continuity`, or `scene-prompt`. The adapter must obtain a valid Turnstile token through the site's configured widget and must never receive a Gemini secret.

## Test
Run `npm run test:nexus` from the repository root in an environment with Node.js. Tests use injected mock providers and do not call Gemini, Cloudflare, or any paid service. A test pass proves only the local module behavior, not live deployment.

## Security and limitations
- Provider adapters must be explicitly enabled; no provider is assumed available or free.
- The router currently uses declared capability and priority only. It does not estimate model quality, price, quota, or uptime.
- Project context is passed in by the caller. These modules do not read browser storage or access user data themselves.
- No video, image, voice, or lip-sync generation is implemented here.
