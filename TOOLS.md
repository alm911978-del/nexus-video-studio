# NEXUS VIDEO 5.0 — Tool Integration Registry

This file tracks real integration status. A tool is **not connected** just because it appears in this list.

## Current repository state

- Static front end: `index.html`, compatible with GitHub Pages.
- Gemini text gateway: source exists under `worker/`; it still requires deployment and secrets before it can work from the website.
- Video generation: no working video-generation API integration is present in the front end.
- AI speech generation and lip-sync: no working integration is present in the front end.
- Local media lab and SRT builder: implemented in the browser; automated CI checks passed on 2026-10-24. Manual browser testing across real media files remains outstanding.

## Status vocabulary

- `planned`: not implemented.
- `source_present_needs_setup`: source exists but requires service setup/deployment.
- `implemented_needs_test`: code exists but no relevant automated or manual test has yet been verified.
- `unit_tested_needs_end_to_end`: automated checks pass, but real user-flow behavior has not been verified.
- `connected_needs_test`: endpoint responds, but a real task has not been verified.
- `verified`: a real end-to-end task succeeded; note the date and exact test.

## Verification record

- **2026-10-24 — GitHub Actions:** `NEXUS Worker Tests` passed on commit `f45e8eab0ca75fb00b3b8826500d97862b603c7a` (run: https://github.com/alm911978-del/nexus-video-studio/actions/runs/40051308947). The workflow ran `npm test` using Node.js 20.
- The suite checks the media lab/SRT controls, backup-import safeguards, escaped record IDs, consistent prototype-version labels, and a mocked successful Gemini 3.8 request.
- **2026-10-24 — Published-site browser smoke test:** confirmed the live page title is `NEXUS VIDEO 5.0 — الاستوديو`, the footer shows prototype `0.3`, the local series-development template generated non-empty output, and two Arabic subtitle lines produced valid sequential SRT timestamps. No real media file was uploaded and no Gemini request was sent.
- **2026-10-24 — GitHub Pages:** latest deployment completed successfully for commit `f45e8eab0ca75fb00b3b8826500d97862b603c7a` (run: https://github.com/alm911978-del/nexus-video-studio/actions/runs/40051308735).
- The Gemini test uses a mocked upstream response; it confirms the gateway code path and request shape, **not** a live Gemini API call or a deployed Cloudflare Worker. The Gemini integration still requires deployment, correct secrets/bindings, and a real end-to-end smoke test. A successful Pages deployment does not prove every interactive feature works in a live browser.

## Safety and cost principles

1. Prefer no-cost browser-local features first; do not promise unlimited free use of external APIs.
2. Never put API secrets in `index.html`, public JSON, GitHub commits, or browser local storage.
3. Put secret-bearing integrations behind a server-side gateway.
4. A health check proves connectivity only, not that generation works.
5. Keep the static site functional and preserve existing project data.
6. Check provider quotas, model availability, regional access, and terms before choosing an API.

## Tool groups

| Priority | Group | Intended capability | Approach | Status |
|---|---|---|---|---|
| P0 | Gemini text | Script development, scene prompts, continuity checks | Existing Cloudflare Worker gateway | source_present_needs_setup |
| P1 | Local media lab | Preview image/video/audio and inspect basic metadata without uploading files | Browser object URLs and built-in media metadata | unit_tested_needs_end_to_end |
| P1 | Subtitles | Create and export SRT from user-supplied caption lines | Browser utility; fixed duration per caption, no speech recognition | unit_tested_needs_end_to_end |
| P1 | Image generation | Create reference frames and concept art | Select a provider only after checking genuine no-cost access and API availability | planned |
| P1 | Video generation | Text-to-video or image-to-video | Requires a usable generation API or a separately hosted model; a website link alone is not an integration | planned |
| P1 | Text-to-speech | Arabic narration and character voices | Compare browser/local options and provider APIs; verify voice quality and limits | planned |
| P2 | Media analysis | Analyze visual/audio content | Start with local metadata and user notes; AI analysis requires an available model | planned |
| P2 | Export pipeline | Export prompts, scripts, scene lists, subtitles, and project backups | Browser-side file generation | planned |
| P3 | Lip-sync | Align speech to character video | Requires a compatible external model/service and available compute/quota | planned |
| P3 | Storage/sync | Keep projects across devices | Requires authenticated backend; localStorage alone is not sync | planned |

## Implemented browser-local features

- **Media lab:** select image/video/audio files, preview supported media, inspect type, size, image/video dimensions and duration when available, then export a JSON metadata report. Files are processed in the browser and are not uploaded.
- **SRT builder:** one non-empty line becomes one caption; each caption receives the selected fixed duration. Download as `.srt`. This does not transcribe speech or synchronize captions to audio automatically.
- These local features require no API key, external account, subscription, or backend. Codec and browser support can vary.

## Recommended implementation order

1. Manually test the local media lab and SRT builder in the published site using representative image, video, and audio files.
2. Complete deployment and real testing of the existing Gemini gateway.
3. Add one image-generation provider and test a real request.
4. Add one video-generation provider and test a real short clip.
5. Add Arabic TTS, then speech recognition and lip-sync only if genuinely available at no cost.
6. Consider account login and cross-device storage after privacy, security, and hosting requirements are clear.

## Definition of done

- Setup steps are documented.
- Secrets remain server-side.
- Health checks exist where supported.
- At least one real end-to-end task has succeeded.
- Errors and quota limits are communicated clearly.
- Status changes to `verified` only when evidence supports it.
