# NEXUS VIDEO 5.0 — Product Roadmap

## Product promise
A transparent, provider-neutral workspace for planning cinematic scenes and orchestrating real media-generation services. The product must clearly distinguish planning tools from connected generation engines.

## Stage 0 — Foundations (review branch)
- [x] Provider-neutral task orchestration primitives.
- [x] Structured character identity lock.
- [x] Media adapter contract and honest completion checks.
- [x] Reusable cinematic, image-to-video and dialogue prompt templates.
- [x] Text-based continuity audit helper; explicitly not computer vision.
- [x] GitHub Actions unit-test workflow.
- [x] Run unit tests and fix reported failures (latest successful run linked from the review PR).
- [ ] Complete human review before merging.

## Stage 1 — Safer, more useful local prototype
- [x] Connect saved character descriptions and saved projects to the prompt lab.
- [x] Associate prompt-lab scenes with their selected project and character.
- [x] Keep prompt-lab drafts in local browser storage.
- [x] Add schema-versioned JSON backup export and validated import, including the prompt-lab draft.
- [x] Add a searchable scene library and edit-in-place flow.
- [x] Add a bounded local activity history with JSON export and clear-history control.
- [x] Bound imported record counts and text lengths; replace unsafe/duplicate IDs; detach orphan scene references.
- [x] Add UI smoke tests for JavaScript syntax, duplicate HTML IDs and missing static DOM targets.
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
- Obtain permission for real-person likeness and voice use.

## Stage 4 — Reliability and collaboration
- Project export/backup and schema migrations.
- Automated accessibility, security and regression checks.
- Optional account/cloud sync only after privacy and hosting costs are understood.
- Usage quotas and transparent cost/free-quota display.
- Document data retention and deletion.

## Stage 5 — Commercial validation
- Interview target creators before adding paid plans.
- Track activation, project completion, repeat usage, generation success rate and retention.
- Test willingness to pay with a small audience before scaling.
- Do not use speculative valuation as a product KPI.

## Success metrics
- Unit tests pass in CI.
- No secrets exposed in the repository or browser bundle.
- Generation success rate measured from actual jobs, not mock tests.
- Clear distinction between requested quality and delivered quality.
- Users can export their work without lock-in.
- Documented cost per successful generated minute before any monetization claim.

## Valuation note
A $1M valuation is an aspiration, not a code feature or guarantee. It depends on customer demand, recurring use, defensibility, margins, growth, and evidence of revenue or strategic value.
