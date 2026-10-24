import json

import pytest
from fastapi import HTTPException

import app as engine_app
import comfyui_provider as provider


def fake_mp4():
    return b"\x00\x00\x00\x18ftypisom" + (b"\x00" * 24)


def fake_webm():
    return bytes.fromhex("1A45DFA3") + (b"\x00" * 24)


@pytest.mark.parametrize(
    ("suffix", "expected_type", "payload"),
    [
        (".mp4", "video/mp4", fake_mp4()),
        (".webm", "video/webm", fake_webm()),
        (".mov", "video/quicktime", fake_mp4()),
        (".mkv", "video/x-matroska", fake_webm()),
    ],
)
def test_generate_video_uses_safe_suffix_and_correct_media_type(monkeypatch, suffix, expected_type, payload):
    monkeypatch.setattr(engine_app, "comfyui_is_configured", lambda: True)
    monkeypatch.setattr(engine_app, "generate_with_comfyui", lambda prompt: (payload, suffix))

    response = engine_app.generate_video(engine_app.GenerateRequest(prompt="cinematic scene"))

    assert response.status_code == 200
    assert response.media_type == expected_type
    assert response.headers["content-disposition"] == f'attachment; filename="nexus-generated{suffix}"'
    assert response.body == payload


@pytest.mark.parametrize("suffix", [".gif", ".html", "", ".mp4\r\nX-Test: injected"])
def test_generate_video_rejects_unsupported_suffix(monkeypatch, suffix):
    monkeypatch.setattr(engine_app, "comfyui_is_configured", lambda: True)
    monkeypatch.setattr(engine_app, "generate_with_comfyui", lambda prompt: (fake_mp4(), suffix))

    with pytest.raises(HTTPException) as exc:
        engine_app.generate_video(engine_app.GenerateRequest(prompt="cinematic scene"))

    assert exc.value.status_code == 502
    assert exc.value.detail["code"] == "INVALID_VIDEO_CONTAINER"


@pytest.mark.parametrize("payload", [b"", b"<html>not a video</html>", b"\x00" * 20])
def test_generate_video_rejects_empty_or_invalid_container_bytes(monkeypatch, payload):
    monkeypatch.setattr(engine_app, "comfyui_is_configured", lambda: True)
    monkeypatch.setattr(engine_app, "generate_with_comfyui", lambda prompt: (payload, ".mp4"))

    with pytest.raises(HTTPException) as exc:
        engine_app.generate_video(engine_app.GenerateRequest(prompt="cinematic scene"))

    assert exc.value.status_code == 502
    assert exc.value.detail["code"] == "INVALID_VIDEO_PAYLOAD"


def test_generate_video_stays_unavailable_without_provider(monkeypatch):
    monkeypatch.setattr(engine_app, "comfyui_is_configured", lambda: False)

    with pytest.raises(HTTPException) as exc:
        engine_app.generate_video(engine_app.GenerateRequest(prompt="cinematic scene"))

    assert exc.value.status_code == 503
    assert exc.value.detail["detail"]["code"] == "VIDEO_ENGINE_NOT_CONFIGURED"


class FakeResponse:
    def __init__(self, payload=None, content=b"", content_type="application/json"):
        self._payload = payload or {}
        self.content = content
        self.headers = {"content-type": content_type}

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeComfyClient:
    def __init__(self, *, view_content=b"", view_type="video/mp4"):
        self.view_content = view_content
        self.view_type = view_type

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def post(self, url, json):
        return FakeResponse({"prompt_id": "test-prompt"})

    def get(self, url, params=None):
        if "/history/" in url:
            return FakeResponse({
                "test-prompt": {
                    "outputs": {
                        "1": {"videos": [{"filename": "sample.mp4", "subfolder": "", "type": "output"}]}
                    }
                }
            })
        return FakeResponse(content=self.view_content, content_type=self.view_type)


def configure_provider(monkeypatch, tmp_path, *, payload, content_type):
    workflow_path = tmp_path / "workflow.json"
    workflow_path.write_text(json.dumps({"1": {"inputs": {"text": "placeholder"}}}), encoding="utf-8")
    monkeypatch.setenv("COMFYUI_BASE_URL", "http://127.0.0.1:8188")
    monkeypatch.setenv("COMFYUI_WORKFLOW_PATH", str(workflow_path))
    monkeypatch.setenv("COMFYUI_PROMPT_NODE_ID", "1")
    monkeypatch.setenv("COMFYUI_PROMPT_INPUT", "text")
    monkeypatch.setattr(
        provider.httpx,
        "Client",
        lambda **kwargs: FakeComfyClient(view_content=payload, view_type=content_type),
    )


def test_comfyui_adapter_rejects_html_even_when_filename_looks_like_mp4(monkeypatch, tmp_path):
    configure_provider(monkeypatch, tmp_path, payload=b"<html>error page</html>", content_type="text/html")

    with pytest.raises(provider.ProviderGenerationError, match="non-video content type"):
        provider.generate_video("test prompt")


def test_comfyui_adapter_rejects_video_named_html_payload(monkeypatch, tmp_path):
    configure_provider(monkeypatch, tmp_path, payload=b"<html>error page</html>", content_type="video/mp4")

    with pytest.raises(provider.ProviderGenerationError, match="container signature"):
        provider.generate_video("test prompt")


def test_comfyui_adapter_accepts_valid_mp4_signature(monkeypatch, tmp_path):
    payload = fake_mp4()
    configure_provider(monkeypatch, tmp_path, payload=payload, content_type="video/mp4")

    content, suffix = provider.generate_video("test prompt")

    assert content == payload
    assert suffix == ".mp4"
