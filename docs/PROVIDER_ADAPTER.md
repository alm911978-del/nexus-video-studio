# Provider Adapter Architecture — NEXUS VIDEO 5.0

## Purpose
Define a safe, extensible interface for future text, image, video, speech, and lip-sync providers. A provider appearing in the UI does not mean it is connected.

## Provider record
Each provider entry should include:
- `id`: stable internal identifier
- `name`: display name
- `capabilities`: supported task types
- `mode`: `external_link`, `server_api`, or `local_model`
- `officialUrl`: official product or documentation URL
- `pricingStatus`: `free`, `limited_free`, `paid`, or `unverified`
- `pricingCheckedAt`: date of last verification
- `authRequired`: boolean or `unknown`
- `connectionStatus`: `not_connected`, `needs_setup`, `connected_needs_test`, or `verified`
- `limitsNote`: short user-facing note
- `docsUrl`: official API docs when a documented API exists

## Adapter contract
A future server-side adapter should expose a consistent internal operation:
`runTask({ providerId, taskType, input, options, requestId })`

Requirements:
1. Validate all input on the server.
2. Resolve `providerId` from an explicit allowlist; never accept arbitrary upstream URLs.
3. Keep API keys in server-side secrets only.
4. Apply timeouts, request-size limits, quotas, and safe retry rules.
5. Normalize successful responses and provider errors without leaking secrets.
6. Track request IDs and non-sensitive timing metadata.
7. Do not retry non-idempotent paid operations blindly.
8. Return a clear unsupported/not-connected response for providers that are external links only.
9. Add unit tests and an end-to-end test before marking a provider `verified`.
10. Document any data sent to an external provider.

## External links versus API integration
An external link simply opens the provider's website. It does not pass project data automatically, authenticate a user, or enable generation inside NEXUS. API integration requires official documentation, server-side credentials, terms review, and successful tests.

## Security rules
- Never store provider secrets in frontend code, localStorage, public repositories, or client-visible error messages.
- Never proxy arbitrary URLs supplied by a user.
- Restrict CORS to intended origins.
- Add rate limiting and usage caps before public deployment.
- Do not claim free access without a recent official source.
