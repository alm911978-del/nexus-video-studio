# NEXUS VIDEO 5.0 — Tool Integration Registry

This file tracks real integration status. A tool is **not connected** just because it appears in this list.

## Current verified repository state

- Static front end: `index.html` (GitHub Pages-compatible).
- Gemini text gateway: source exists under `worker/`; it requires Cloudflare deployment and secrets before it can work from the website.
- Video generation: no working video-generation API integration is present in the current front end.
- Speech/audio/lip-sync: no working integration is present in the current front end.

## Integration principles

1. Prefer a free tier or locally runnable option; never promise unlimited free use.
2. Never put API secrets in `index.html`, public JSON, GitHub commits, or browser local storage.
3. Put secret-bearing integrations behind a server-side gateway (Cloudflare Worker or another backend).
4. Give every integration an explicit status: `planned`, `source_present_needs_setup`, `connected_needs_test`, or `verified`.
5. A successful health check proves connectivity only; it does not prove that generation works.
6. Keep the existing static website working. Add integrations incrementally and preserve backups.
7. Before recommending a provider, verify its current free quota, terms, model availability, and regional access.

## Proposed tool groups

| Priority | Group | Intended capability | Initial approach | Status |
|---|---|---|---|---|
| P0 | Gemini text | Script development, scene prompts, continuity checks | Existing Cloudflare Worker gateway | source_present_needs_setup |
| P1 | Image generation | Create reference frames / concept art | Choose a provider only after checking current free access and API availability | planned |
| P1 | Video generation | Text-to-video or image-to-video | Select a provider with an accessible API; a website link alone is not an integration | planned |
| P1 | Text-to-speech | Arabic narration and character voices | Compare browser/local options and provider APIs; verify Arabic quality and quotas | planned |
| P2 | Audio utilities | Audio upload, format checks, basic metadata | Browser-side tools where practical | planned |
| P2 | Subtitles | SRT/VTT creation and export | Local text processing first; speech recognition requires a separate engine | planned |
| P2 | Media analysis | Analyze uploaded image/video metadata and shot notes | Start with user-provided files and metadata; model-based analysis needs a connected model | planned |
| P2 | Export pipeline | Download prompts, scripts, scene lists, subtitles, project backups | Implement locally in the static app | planned |
| P3 | Lip-sync | Align speech to character video | Needs a compatible external model/service and likely compute or quota | planned |
| P3 | Storage/sync | Keep projects across devices | Requires an authenticated backend; localStorage alone is not sync | planned |

## Recommended order

1. Test and finish the existing Gemini gateway.
2. Add a safe provider-adapter pattern and a visible status panel.
3. Add one image provider and test a real request.
4. Add one video provider and test a real short clip.
5. Add Arabic TTS, subtitles, and exports.
6. Consider lip-sync and cross-device storage after cost, privacy, and API requirements are clear.

## Definition of done for each integration

- Setup steps documented.
- Secrets stored server-side only.
- Health check implemented where the provider supports it.
- One real end-to-end test completed.
- Errors and quota limits shown clearly to the user.
- Status updated here only after evidence supports it.
