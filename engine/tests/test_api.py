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
    assert payload["audio_postproduction"]["available"] in (True, False)


def test_generate_fails_honestly_without_provider():
    response = client.post("/api/v1/generate", json={"prompt": "A cinematic desert scene"})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "VIDEO_ENGINE_NOT_CONFIGURED"


def test_audio_mux_reports_missing_ffmpeg(tmp_path, monkeypatch):
    # Missing runtime dependency must be reported explicitly before processing uploads.
    monkeypatch.setenv("FFMPEG_PATH", str(tmp_path / "nonexistent-ffmpeg"))
    response = client.post(
        "/api/v1/audio/mux",
        files={
            "video": ("not-video.txt", b"bad", "text/plain"),
            "audio": ("voice.wav", b"bad", "audio/wav"),
        },
        data={"audio_start_seconds": "0", "video_audio_policy": "replace"},
    )
    assert response.status_code == 503
    assert "FFmpeg" in response.json()["detail"]


def test_audio_mux_rejects_negative_offset_when_ffmpeg_is_available(monkeypatch):
    # Exercise request validation without launching FFmpeg.
    monkeypatch.setattr("app._ffmpeg_path", lambda: "/usr/bin/ffmpeg")
    response = client.post(
        "/api/v1/audio/mux",
        files={
            "video": ("clip.mp4", b"placeholder", "video/mp4"),
            "audio": ("voice.wav", b"placeholder", "audio/wav"),
        },
        data={"audio_start_seconds": "-1", "video_audio_policy": "replace"},
    )
    assert response.status_code == 400
    assert "between 0 and 3600" in response.json()["detail"]



def test_audio_stream_probe_detects_silent_video(tmp_path, monkeypatch):
    from app import _has_audio_stream

    monkeypatch.setattr("app.shutil.which", lambda name: "/usr/bin/ffprobe")
    monkeypatch.setattr(
        "app.subprocess.run",
        lambda *args, **kwargs: type("Result", (), {"returncode": 0, "stdout": "", "stderr": ""})(),
    )
    assert _has_audio_stream(tmp_path / "silent.mp4") is False


def test_audio_stream_probe_detects_existing_audio(tmp_path, monkeypatch):
    from app import _has_audio_stream

    monkeypatch.setattr("app.shutil.which", lambda name: "/usr/bin/ffprobe")
    monkeypatch.setattr(
        "app.subprocess.run",
        lambda *args, **kwargs: type("Result", (), {"returncode": 0, "stdout": "1\n", "stderr": ""})(),
    )
    assert _has_audio_stream(tmp_path / "with-audio.mp4") is True
