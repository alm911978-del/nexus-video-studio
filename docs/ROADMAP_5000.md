# NEXUS VIDEO 5.0 — Roadmap and Task Registry

This file is a **living registry**, not a claim that 5,000 tasks have already been individually implemented or validated. Tasks are tracked by stable IDs, with acceptance criteria and status. Add new tasks only when they represent distinct work; do not inflate the count with duplicates.

## Status vocabulary
- `planned`
- `in_progress`
- `blocked`
- `implemented_needs_test`
- `verified`
- `deferred`

## Priority vocabulary
- `P0`: security/data loss/release blocker
- `P1`: core workflow
- `P2`: usability and maintainability
- `P3`: optional polish

## Initial task batch (001–050)

| ID | Priority | Task | Acceptance criterion | Status |
|---|---|---|---|---|
| NX-0001 | P1 | Establish current repository baseline | Files and current capabilities documented | verified |
| NX-0002 | P1 | Create implementation log | Log exists and distinguishes verified from planned work | verified |
| NX-0003 | P1 | Document provider adapter contract | Security and connection states documented | verified |
| NX-0004 | P1 | Add standalone generator directory page | Page exists with official links and transparent labels | implemented_needs_test |
| NX-0005 | P1 | Add generator page mobile layout | Page usable at narrow viewport widths | implemented_needs_test |
| NX-0006 | P1 | Add visible rights footer | Copyright wording appears on generator page | implemented_needs_test |
| NX-0007 | P1 | Verify external links | Links checked against official destinations | planned |
| NX-0008 | P1 | Integrate hub navigation into main app | Main app links to hub without breaking existing layout | planned |
| NX-0009 | P1 | Test hub with JavaScript disabled | Main link list remains usable | planned |
| NX-0010 | P1 | Add link verification date policy | Unverified pricing never shown as guaranteed free | planned |
| NX-0011 | P0 | Audit Worker CORS behavior | Tests prove only intended origins are accepted | planned |
| NX-0012 | P0 | Audit public API rate limiting | Limits work and failure modes are tested | planned |
| NX-0013 | P0 | Audit secret handling | No secrets in frontend, repository, or error responses | planned |
| NX-0014 | P0 | Audit arbitrary URL fetches | No user-controlled upstream fetch without strict allowlist | planned |
| NX-0015 | P1 | Test missing provider secret | Safe and actionable error without secret disclosure | planned |
| NX-0016 | P1 | Test provider timeout | Timeout returns normalized error | planned |
| NX-0017 | P1 | Test upstream 429 response | Rate-limit response is handled safely | planned |
| NX-0018 | P1 | Test upstream 5xx response | Retry policy does not duplicate unsafe operations | planned |
| NX-0019 | P1 | Document deployment and rollback | Steps verified against actual configuration | planned |
| NX-0020 | P1 | Add project save/restore tests | Data survives reload and malformed imports are rejected | planned |
| NX-0021 | P1 | Add JSON import size limit | Oversized import is rejected with clear message | planned |
| NX-0022 | P1 | Add JSON schema/version validation | Unsupported project schema is handled safely | planned |
| NX-0023 | P1 | Add Markdown scene export | Export contains scene order and prompts | planned |
| NX-0024 | P1 | Add generator search/filter | Search and category filter work with keyboard | planned |
| NX-0025 | P1 | Add explicit provider connection badges | External links are not presented as connected APIs | planned |
| NX-0026 | P1 | Add provider data source notes | Each claim links to an official source | planned |
| NX-0027 | P2 | Add collapsible sidebar | Sidebar opens/closes on touch and keyboard | planned |
| NX-0028 | P2 | Add sidebar search | Search filters visible navigation items | planned |
| NX-0029 | P2 | Add reduced-motion support | Motion respects user preference | planned |
| NX-0030 | P2 | Add theme preference persistence | Theme survives reload without breaking contrast | planned |
| NX-0031 | P1 | Audit Arabic RTL layout | Core workflows remain usable in Arabic | planned |
| NX-0032 | P1 | Audit English LTR layout | Core workflows remain usable in English | planned |
| NX-0033 | P2 | Add keyboard focus visibility | Interactive controls have visible focus | planned |
| NX-0034 | P2 | Add empty states | Empty lists explain the next action | planned |
| NX-0035 | P2 | Normalize error messaging | User-facing errors avoid internal stack traces | planned |
| NX-0036 | P2 | Measure initial load performance | Baseline recorded before optimization | planned |
| NX-0037 | P2 | Measure mobile layout stability | No avoidable horizontal overflow | planned |
| NX-0038 | P2 | Remove dead CSS/JS after evidence | Existing flows pass regression tests | planned |
| NX-0039 | P1 | Add navigation regression tests | Core navigation targets exist and are reachable | planned |
| NX-0040 | P1 | Add localStorage failure test | App remains usable if storage is unavailable | planned |
| NX-0041 | P1 | Add malformed JSON test | Import fails safely and preserves existing data | planned |
| NX-0042 | P1 | Add duplicate scene ID test | Import does not corrupt scene identity | planned |
| NX-0043 | P2 | Add project templates | Three templates produce valid editable projects | planned |
| NX-0044 | P2 | Add prompt copy feedback | Copy action confirms success or failure | planned |
| NX-0045 | P2 | Add shortcut help | Shortcuts are discoverable and do not hijack text input | planned |
| NX-0046 | P1 | Audit dependency provenance | Third-party assets and licenses are documented | planned |
| NX-0047 | P1 | Add accessibility smoke checks | Key actions are reachable and labelled | planned |
| NX-0048 | P1 | Check Pages deployment after merge | Deployed page returns expected content | planned |
| NX-0049 | P1 | Update README version description | Version and actual feature state agree | planned |
| NX-0050 | P1 | Review batch before merge | Diff, tests, risks, and rollback are recorded | planned |

## Expansion plan toward 5,000 distinct tasks

Do not generate thousands of placeholder tasks in one pass. Expand the registry in reviewed batches, assigning a unique ID and acceptance criterion to each distinct task.

Suggested workstreams:
1. Security and privacy (NX-0100–NX-0599)
2. Core project workflow and persistence (NX-0600–NX-1099)
3. Generator directory and provider adapters (NX-1100–NX-1699)
4. Story, scene, character, and prompt tools (NX-1700–NX-2199)
5. Media and export workflows (NX-2200–NX-2699)
6. Performance and reliability (NX-2700–NX-3199)
7. Accessibility, RTL, localization (NX-3200–NX-3599)
8. Testing, CI, deployment, rollback (NX-3600–NX-4099)
9. Documentation and onboarding (NX-4100–NX-4499)
10. Product analytics with privacy safeguards, growth experiments, and investor readiness (NX-4500–NX-4799)
11. Future verified engine integrations and model lifecycle (NX-4800–NX-4999)

These ranges are reserved planning capacity, not existing task counts. Add individual tasks only after the relevant work is understood.
