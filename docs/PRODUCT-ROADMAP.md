# NEXUS VIDEO 5.0 — Product Roadmap

## Product promise
A transparent, provider-neutral workspace for planning cinematic scenes and orchestrating real media-generation services. The product must clearly distinguish planning tools from connected generation engines.

## Stage 0 — Foundations (current review branch)
- [x] Provider-neutral task orchestration primitives
- [x] Structured character identity lock
- [x] Media adapter contract and honest completion checks
- [x] Reusable cinematic prompt templates
- [x] Text-based continuity audit helper
- [x] Unit-test workflow
- [ ] Run unit tests and fix all failures
- [ ] Review branch before merging

## Stage 1 — Safe usable prototype
- Connect character profiles and prompt templates to the existing UI.
- Keep user data local by default and explain storage limitations.
- Add import/export for project JSON.
- Add accessible status messages, validation, and graceful error states.
- Add a job history with provider, status, timestamps and output references.
- Never put provider API keys in client-side HTML or JavaScript.

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
