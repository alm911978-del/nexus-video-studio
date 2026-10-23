# NEXUS VIDEO 5.0 — Engine Backend (v1 foundation)

This is the first backend foundation for turning the static NEXUS VIDEO interface into a real video workflow.

## Honest current status

- `GET /health` and `GET /api/v1/capabilities` are implemented.
- `POST /api/v1/audio/mux` can combine an uploaded silent MP4 and uploaded audio tracks **when FFmpeg is installed**.
- `POST /api/v1/generate` intentionally returns HTTP 503 until a real provider adapter is configured. It does not fabricate a video or pretend generation succeeded.
- This backend is not deployed by GitHub Pages. It must run on a server/container with FFmpeg and, for AI generation, a compatible GPU/provider.
- No API keys belong in the frontend.

## Run locally

Requires Python 3.11+ and FFmpeg installed and available on PATH.

```bash
cd engine
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/docs` to test the API.

## Test audio mux

Use `POST /api/v1/audio/mux` as multipart form data:
- `video`: silent MP4
- `audio`: narration or sound-effect file (repeatable tracks are not yet supported in this first endpoint)
- `audio_start_seconds`: optional offset, default 0
- `video_audio_policy`: `replace` (default) or `mix`

The endpoint returns a rendered MP4. Test with media you own or are licensed to use.

## Next milestone: real video generation

Implement one provider adapter only after confirming a provider's current API, model access, license, and cost/usage limits. Set server-side credentials in environment secrets. The first generation acceptance test must save and play a real MP4 from a request; UI status alone is not proof.
