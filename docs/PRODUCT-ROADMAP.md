# NEXUS VIDEO 5.0 — Product Roadmap (Unified by Grok)

## Product promise
A transparent, provider-neutral workspace for planning cinematic scenes and orchestrating real media-generation services. The product must clearly distinguish planning tools from connected generation engines.

## Stage 0 — Foundations (this unified branch)
- [x] Provider-neutral task orchestration primitives.
- [x] Structured character identity lock.
- [x] Media adapter contract and honest completion checks.
- [x] Reusable cinematic, image-to-video and dialogue prompt templates.
- [x] Text-based continuity audit helper; explicitly not computer vision.
- [x] FastAPI engine foundation with /health, /capabilities, audio mux, optional ComfyUI.
- [x] GitHub Actions unit-test workflows.
- [ ] Complete human review before merging to main.

## Stage 1 — Safer, more useful local prototype
- [x] Connect saved character descriptions and saved projects to the prompt lab.
- [x] Associate prompt-lab scenes with their selected project and character.
- [x] Keep prompt-lab drafts in local browser storage.
- [x] Add schema-versioned JSON backup export and validated import.
- [x] Add a searchable scene library and edit-in-place flow.
- [x] Add a bounded local activity history.
- [ ] Add local job history with timestamps, provider, status and verified output references.
- [ ] Add accessibility and mobile browser regression checks.
- [ ] Never put provider API keys in client-side HTML or JavaScript.

## Stage 2 — First real generation integration
- Select one documented image-to-video provider with a verified accessible quota.
- Implement its adapter server-side with secret storage, request timeout, rate limits and response validation.
- Verify output file type, dimensions, duration and provider job status.
- Display actual resolution and duration from returned metadata where available.
- Test failure, timeout, quota exhaustion and cancellation.

## Stage 3 — Identity and speech
- Select a provider that supports reference images or persistent character identity.
- Evaluate the same character across at least 10 generated shots with a written rubric.
- Add audio-driven lip-sync only after testing supported languages, including Arabic.
- Separate text-to-speech, voice cloning, dubbing and lip-sync as distinct capabilities.

## Stage 4 — Reliability and collaboration
- Project export/backup and schema migrations.
- Automated accessibility, security and regression checks.
- Optional account/cloud sync only after privacy and hosting costs are understood.
- Usage quotas and transparent cost/free-quota display.

## Success metrics
- Unit tests pass in CI.
- No secrets exposed in the repository or browser bundle.
- Generation success rate measured from actual jobs, not mock tests.
- Clear distinction between requested quality and delivered quality.
- Users can export their work without lock-in.
