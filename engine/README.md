# NEXUS VIDEO 5.0 — Engine Backend (v1 foundation)

This is the first backend foundation for turning the static NEXUS VIDEO interface into a real video workflow.

## Honest current status

- `GET /health` and `GET /api/v1/capabilities` are implemented.
- `POST /api/v1/audio/mux` can combine an uploaded silent MP4 and uploaded audio tracks **when FFmpeg is installed**.
- `POST /api/v1/generate` returns a real video only when the optional ComfyUI adapter is configured and a reachable workflow successfully produces a video. Otherwise it returns a clear error; it never fabricates a result.
- `engine/comfyui_provider.py` integrates with ComfyUI's documented `/prompt`, `/history/{prompt_id}`, and `/view` API routes. It requires a running ComfyUI server, an API-format workflow JSON, installed video-generation nodes/models, and suitable GPU/compute.
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

## Configure optional ComfyUI generation

1. Start ComfyUI on a machine the backend can reach. The ComfyUI API is normally available at `http://127.0.0.1:8188` when running on the same host.
2. Load a video-generation workflow in ComfyUI and export it in **API format**. Save it as `engine/workflow_api.json` (this model/workflow file is not included because required models and node ids vary).
3. Identify the node id and input field that receive the positive text prompt.
4. Set the environment variables shown in `.env.example`: `COMFYUI_BASE_URL`, `COMFYUI_WORKFLOW_PATH`, `COMFYUI_PROMPT_NODE_ID`, and `COMFYUI_PROMPT_INPUT`.
5. Restart the backend, check `/api/v1/capabilities`, then send `POST /api/v1/generate` with JSON such as `{"prompt":"A cinematic wide shot of an Arabian desert at blue hour" }`.
6. Verify the returned file is a playable video. A configured URL alone is not proof that the model/workflow can generate successfully.

The adapter uses a server-side ComfyUI service. It does not host ComfyUI, download model weights, provide a GPU, or make remote services free. Never expose an unauthenticated ComfyUI instance to the public internet. Add authentication and deployment-specific network restrictions before exposing this API publicly.
