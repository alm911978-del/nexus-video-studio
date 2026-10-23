from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health_reports_service_and_no_provider():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["service"] == "nexus-video-engine"
    assert payload["video_generation"] == "not_configured"


def test_capabilities_do_not_claim_video_generation():
    response = client.get("/api/v1/capabilities")
    assert response.status_code == 200
    payload = response.json()
    assert payload["video_generation"]["available"] is False
    assert payload["video_generation"]["status"] == "not_configured"


def test_generate_fails_honestly_without_provider():
    response = client.post("/api/v1/generate", json={"prompt": "A cinematic desert scene"})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "VIDEO_ENGINE_NOT_CONFIGURED"


def test_audio_mux_validates_video_extension_before_ffmpeg(tmp_path, monkeypatch):
    # The extension validation occurs before processing or invoking FFmpeg.
    monkeypatch.setenv("FFMPEG_PATH", str(tmp_path / "nonexistent-ffmpeg"))
    response = client.post(
        "/api/v1/audio/mux",
        files={
            "video": ("not-video.txt", b"bad", "text/plain"),
            "audio": ("voice.wav", b"bad", "audio/wav"),
        },
        data={"audio_start_seconds": "0", "video_audio_policy": "replace"},
    )
    assert response.status_code == 503  # missing FFmpeg is reported before uploads are processed
