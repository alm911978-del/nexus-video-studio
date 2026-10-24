# NEXUS VIDEO 5.0 — Engine Backend (v1 foundation)

This is the first backend foundation for turning the static NEXUS VIDEO interface into a real video workflow.

## Honest current status

- `GET /health` and `GET /api/v1/capabilities` are implemented.
- `POST /api/v1/audio/mux` can combine an uploaded silent MP4 and uploaded audio tracks **when FFmpeg is installed**.
- `POST /api/v1/generate` returns a real video only when the optional ComfyUI adapter is configured and a reachable workflow successfully produces a video. Otherwise it returns a clear error; it never fabricates a result.
- This backend is not deployed by GitHub Pages. It must run on a server/container with FFmpeg and, for AI generation, a compatible GPU/provider.
- No API keys belong in the frontend.

## Run locally

Requires Python 3.11+ and FFmpeg installed and available on PATH.

```bash
cd engine
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000/docs` to test the API.

## Test audio mux

Use `POST /api/v1/audio/mux` as multipart form data:
- `video`: silent MP4
- `audio`: narration or sound-effect file
- `audio_start_seconds`: optional offset, default 0
- `video_audio_policy`: `replace` (default) or `mix`

## Configure optional ComfyUI generation

See the original engine documentation and `.env.example` for required environment variables. Never expose an unauthenticated ComfyUI instance to the public internet.
