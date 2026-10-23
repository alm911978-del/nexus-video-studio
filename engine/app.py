from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

APP_VERSION = "0.1.1"
app = FastAPI(
    title="NEXUS VIDEO 5.0 Engine API",
    version=APP_VERSION,
    description="Honest starter backend for video generation and audio post-production.",
)


def _ffmpeg_path() -> str | None:
    configured = os.getenv("FFMPEG_PATH", "ffmpeg")
    if Path(configured).is_file():
        return configured
    return shutil.which(configured)


def _has_audio_stream(video_path: Path) -> bool:
    """Return whether ffprobe detects an audio stream; fail closed if probing fails."""
    ffprobe = shutil.which(os.getenv("FFPROBE_PATH", "ffprobe"))
    if not ffprobe:
        raise HTTPException(
            status_code=503,
            detail="FFprobe is required to safely mix audio with an existing video track.",
        )
    try:
        probe = subprocess.run(
            [
                ffprobe, "-v", "error", "-select_streams", "a:0",
                "-show_entries", "stream=index", "-of", "csv=p=0", str(video_path),
            ],
            capture_output=True, text=True, timeout=20,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Video stream inspection timed out.")
    if probe.returncode != 0:
        raise HTTPException(status_code=422, detail="The uploaded video could not be inspected.")
    return bool(probe.stdout.strip())


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": "nexus-video-engine",
        "version": APP_VERSION,
        "ffmpeg_available": _ffmpeg_path() is not None,
        "video_generation": "not_configured",
    }


@app.get("/api/v1/capabilities")
def capabilities() -> dict:
    ffmpeg = _ffmpeg_path() is not None
    return {
        "video_generation": {
            "available": False,
            "status": "not_configured",
            "message": "No real video provider is connected. No generation is claimed.",
        },
        "audio_postproduction": {
            "available": ffmpeg,
            "features": ["mux_one_audio_track", "replace_or_mix_source_audio"],
            "requires": "FFmpeg installed on the backend host",
        },
        "next_step": "Configure and test a real video-provider adapter before enabling generation.",
    }


@app.post("/api/v1/generate")
def generate_not_configured() -> None:
    """Fail clearly until a real video provider has been integrated."""
    raise HTTPException(
        status_code=503,
        detail={
            "code": "VIDEO_ENGINE_NOT_CONFIGURED",
            "message": "NEXUS VIDEO has no connected video-generation provider yet. No video was generated.",
        },
    )


@app.post("/api/v1/audio/mux")
async def mux_audio(
    video: UploadFile = File(..., description="Silent or existing MP4 video"),
    audio: UploadFile = File(..., description="Narration or sound-effect audio file"),
    audio_start_seconds: float = Form(0.0),
    video_audio_policy: Literal["replace", "mix"] = Form("replace"),
):
    """Attach an audio track to a video using FFmpeg and return a real MP4."""
    ffmpeg = _ffmpeg_path()
    if not ffmpeg:
        raise HTTPException(
            status_code=503,
            detail="FFmpeg is not installed on this backend. Audio mux is unavailable.",
        )
    if audio_start_seconds < 0 or audio_start_seconds > 3600:
        raise HTTPException(status_code=400, detail="audio_start_seconds must be between 0 and 3600.")
    if not video.filename or Path(video.filename).suffix.lower() not in {".mp4", ".mov", ".m4v"}:
        raise HTTPException(status_code=400, detail="Video must be an MP4/MOV/M4V file.")
    if not audio.filename or Path(audio.filename).suffix.lower() not in {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"}:
        raise HTTPException(status_code=400, detail="Audio must be WAV, MP3, M4A, AAC, OGG, or FLAC.")

    workdir = Path(tempfile.mkdtemp(prefix="nexus-video-"))
    input_video = workdir / "input-video"
    input_audio = workdir / "input-audio"
    output_video = workdir / "output.mp4"
    try:
        # Stream uploads to disk to avoid holding full media files in memory.
        for upload, target in ((video, input_video), (audio, input_audio)):
            size = 0
            with target.open("wb") as handle:
                while chunk := await upload.read(1024 * 1024):
                    size += len(chunk)
                    if size > 500 * 1024 * 1024:
                        raise HTTPException(status_code=413, detail="Each upload is limited to 500 MB.")
                    handle.write(chunk)

        if video_audio_policy == "mix" and _has_audio_stream(input_video):
            delay_ms = int(audio_start_seconds * 1000)
            filter_complex = (
                f"[1:a]adelay={delay_ms}|{delay_ms}[voice];"
                "[0:a][voice]amix=inputs=2:duration=first:dropout_transition=2[aout]"
            )
            command = [
                ffmpeg, "-y", "-i", str(input_video), "-i", str(input_audio),
                "-filter_complex", filter_complex, "-map", "0:v:0", "-map", "[aout]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                str(output_video),
            ]
        else:
            # A silent source has nothing to mix; attach the supplied audio instead.
            command = [
                ffmpeg, "-y", "-i", str(input_video), "-itsoffset", str(audio_start_seconds),
                "-i", str(input_audio), "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                "-movflags", "+faststart", str(output_video),
            ]

        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        if result.returncode != 0 or not output_video.exists() or output_video.stat().st_size == 0:
            raise HTTPException(
                status_code=422,
                detail={"message": "FFmpeg could not combine these files.", "diagnostic": result.stderr[-1500:]},
            )
        return FileResponse(
            output_video,
            media_type="video/mp4",
            filename="nexus-video-with-audio.mp4",
            background=BackgroundTask(shutil.rmtree, workdir, ignore_errors=True),
        )
    except subprocess.TimeoutExpired:
        shutil.rmtree(workdir, ignore_errors=True)
        raise HTTPException(status_code=408, detail="Audio rendering exceeded the 5-minute limit.")
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise
    finally:
        await video.close()
        await audio.close()
