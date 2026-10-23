# NEXUS Security Baseline

- Never commit API keys, access tokens, Turnstile secrets, session cookies, or private provider URLs.
- Browser code may contain only public configuration, never secret credentials.
- All provider requests must be validated server-side; enforce request size, prompt length, timeout, and rate limits.
- Treat prompts, uploads, provider responses and imported project files as untrusted input.
- Validate backup schema versions; allowlist fields; bound record counts and text lengths; regenerate unsafe or duplicate IDs; never trust imported HTML attributes.
- Limit backup uploads to 5 MB and warn before replacing existing local project data.
- Validate output types and file sizes before offering downloads or previews.
- For media adapters, require absolute HTTPS asset URLs; reject active schemes, cleartext HTTP, embedded URL credentials and control characters. URL syntax alone does not prove that the remote file exists or has expected contents.
- Restrict cross-origin access to the known production origin and any explicitly approved development origin.
- Use no-store headers for sensitive responses and avoid logging prompt contents or secrets.
- Provide clear failure messages without exposing stack traces or secret configuration.
- Ask permission before uploading user media to an external provider; explain the provider's terms and retention where known.
- Provide export and deletion paths for user project data.
- LocalStorage is browser-local and is not encrypted cloud storage. Users should keep backups private and avoid storing secrets in project descriptions or prompts.
- Review dependency updates and pin major runtime/tool versions in CI.
- Run security review before connecting a new provider or enabling account/cloud features.

This is a baseline checklist, not a security certification. Each deployed service must be tested in its actual configuration.
