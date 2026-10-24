# NEXUS VIDEO 5.0 — Architecture

## High-level diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (GitHub Pages)                                      │
│  index.html + i18n.js + assets + src/nexus/* (ES modules)    │
│  localStorage projects / characters / scenes                 │
│  Optional: Supabase Auth UI (publishable key only)           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + Turnstile token
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (nexus gateway)                           │
│  Origin allowlist · body limits · Turnstile · IP rate limit  │
│  Provider allowlist: Gemini / Groq / OpenRouter / Mistral    │
│  Secrets: *_API_KEY, TURNSTILE_SECRET_KEY (never in git)     │
└───────────────────────────┬─────────────────────────────────┘
                            │ provider HTTPS
                            ▼
                   External LLM APIs

Optional (not on Pages):
┌─────────────────────────────────────────────────────────────┐
│  FastAPI engine (engine/)                                    │
│  /health · /capabilities · /generate · /audio/mux            │
│  FFmpeg · optional ComfyUI adapter                           │
│  Must run on a host with Python + FFmpeg (+ GPU if needed)   │
└─────────────────────────────────────────────────────────────┘
```

## Module map (`src/nexus/`)

| Module | Role |
|--------|------|
| `task-registry.js` | Named text tasks (series, episode, continuity, scene-prompt) |
| `model-router.js` | Select enabled provider by capability + priority |
| `orchestrator.js` | Run task with safe context + validation |
| `project-context.js` | Bounded, sanitized project/character context |
| `result-validator.js` | Reject empty / oversized provider output |
| `media-provider-contract.js` | Capability contract for video/audio providers |
| `media-pipeline.js` | Dispatch media job; require safe HTTPS asset URL |
| `character-lock.js` | Stable textual character identity |
| `continuity-audit.js` | Text-only continuity helper |
| `prompt-templates.js` | Cinematic / i2v / dialogue templates |
| `security/*` | Sanitization, URL policy, header constants |
| `jobs/job-model.js` | Job lifecycle states for UI and engine |

## Design principles

1. **Honest status** — never claim generation without a configured, tested provider.  
2. **Provider-neutral** — adapters inject capabilities; core never hard-codes a vendor.  
3. **Fail closed** — missing config → clear error codes, not fake success.  
4. **Secrets boundary** — browser never sees provider keys.  
5. **Branch discipline** — feature work on `grok/*` or `feature/*`; `main` stays releasable.

## What GitHub Pages cannot do

- Run Python / FFmpeg / GPU workloads.  
- Hold long-lived secrets safely.  
- Act as a media processing backend.

Those belong on Worker (text) or a dedicated host (video engine).
