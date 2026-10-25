# NEXUS VIDEO — Monitoring & Automation Board

Last updated: 2026-10-26

This file is the living status board for automated checks, integrations, and next actions.
Update it whenever CI results, provider status, or integration state change.

## Automated checks currently active

| Check | Trigger | Status | Notes |
|-------|---------|--------|-------|
| Worker unit tests (`npm test`) | push/PR to worker, index, i18n, tests + weekly schedule | Active | Runs on Node 20 |
| Site diagnostics | specific branches / PRs | Active | Static shell + accessibility smoke |
| Dependabot (npm + GitHub Actions) | Weekly (Monday) | Active | Major version bumps ignored by default |
| GitHub Pages deployment | push to main | Active | Hosted at https://alm911978-del.github.io/nexus-video-studio/ |

## Integration status (source of truth also in TOOLS.md)

| Integration | Status | Owner action required |
|-------------|--------|-----------------------|
| Cloudflare Worker (LLM gateway) | source_present_needs_setup | Deploy Worker + set secrets + Turnstile + KV |
| Gemini / Groq / OpenRouter / Mistral | source_present_needs_setup | Add at least one provider secret |
| Supabase Auth | partial (UI present) | Set Project URL + Publishable key in index.html |
| Local Media Lab + SRT | unit_tested_needs_end_to_end | Manual browser test with real files |
| Image / Video generation | planned | Choose provider after free-tier verification |
| TTS / Lip-sync | planned | — |

## What Grok monitors for you

- Open PRs and CI status on this repository
- Dependabot PRs (will review and comment)
- TOOLS.md and MONITORING.md consistency
- Security hygiene (no secrets in client code)
- Weekly scheduled test runs

## Immediate recommended actions (priority order)

1. **Merge or close existing open PRs** (#10 accessibility, #12 AI Generator Hub, #13 smoke checks) after review.
2. **Deploy the Cloudflare Worker** following `worker/README.md` and mark the LLM gateway as `connected_needs_test` in TOOLS.md once a real request succeeds.
3. **Complete Supabase setup** (URL + publishable key) so account isolation works.
4. **Manual browser pass** of Media Lab + SRT on the live Pages site and record the date here.
5. After the above, pick one image-generation provider for a controlled pilot.

## How to request further automation

Tell Grok:
- "راجع الـ PRs المفتوحة"
- "حدّث TOOLS.md بعد ما نشرت الـ Worker"
- "أضف اختبار لميزة X"
- "راقب الـ CI أسبوعياً"

Grok will open PRs, update this board, and report results.
