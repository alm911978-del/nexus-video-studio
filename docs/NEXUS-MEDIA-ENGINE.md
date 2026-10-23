# NEXUS Ω Media Engine Foundation

This branch adds provider-neutral building blocks for identity continuity, image/video job dispatch, and speech-driven lip-sync.

## Modules
- `src/nexus/character-lock.js`: structured character identity fields and a reusable continuity prompt.
- `src/nexus/media-provider-contract.js`: explicit provider capabilities and selection; no provider is assumed enabled.
- `src/nexus/media-pipeline.js`: input validation, bounded duration, progress events, adapter dispatch, and honest completion checks.
- `src/nexus/lipsync.js`: speech/lip-sync job preparation using an explicitly configured adapter.

## Required provider adapter
Configure an adapter in application code only after choosing a real provider and implementing its documented API:
```js
{
  id: "your-configured-provider",
  enabled: true,
  capabilities: ["image-to-video", "audio-lip-sync"],
  adapter: async ({ mode, input, onProgress }) => {
    // Call a real provider securely from a server-side adapter.
    // Return { status: "completed", assetUrl: "...", mediaType: "video/mp4" }
    // only after the provider confirms successful output.
  }
}
```

Never put secret API keys in browser code or commit them to Git. The adapter contract is illustrative, not a working provider integration.

## Important limits
- These modules do not generate pixels, synthesize speech, animate faces, upscale files, or call a third-party API on their own.
- A character lock improves prompt consistency but cannot guarantee identical faces. Stronger identity preservation requires a provider that supports reference images/character IDs and must be evaluated on generated clips.
- Lip-sync requires an actual audio-driven facial animation provider. Text-to-speech alone does not animate the mouth.
- "high" and "highest-available" are preferences; output resolution, frame rate, duration and fidelity are determined by the provider and must be checked from the returned asset.
- Image-to-video and text/audio-to-video require separate capabilities and may be supplied by different providers.
- Do not expose private media URLs or provider credentials in client-visible logs.

## Integration checklist
1. Add a server-side adapter for a selected provider and document its free-tier limits and terms.
2. Store credentials in server secrets, never in `index.html`.
3. Add UI controls for reference image, dialogue/audio, aspect ratio, duration, and quality preference.
4. Validate real provider responses and file metadata.
5. Add tests with mock adapters; run tests locally/CI before claiming verified behavior.
6. Connect to `index.html` only after the provider and security model are verified.
