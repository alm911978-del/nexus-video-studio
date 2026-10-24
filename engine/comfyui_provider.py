"""Optional ComfyUI API adapter for NEXUS VIDEO.

Requires a running ComfyUI server, an API-format workflow JSON file, and a
workflow node id whose input field accepts the text prompt. This adapter does
not install models or provide GPU compute.
"""
from __future__ import annotations

import copy
import json
import os
import time
from pathlib import Path
from typing import Any

import httpx


SUPPORTED_VIDEO_SUFFIXES = {".mp4", ".webm", ".mov", ".mkv"}


def _looks_like_video_payload(content: bytes, suffix: str) -> bool:
    """Check basic container signatures; this is a sanity check, not full media decoding."""
    if not isinstance(content, bytes) or len(content) < 12:
        return False
    if suffix in {".mp4", ".mov"}:
        return content[4:8] == b"ftyp"
    if suffix in {".webm", ".mkv"}:
        return content.startswith(bytes.fromhex("1A45DFA3"))
    return False


class ProviderNotConfigured(RuntimeError):
    pass


class ProviderGenerationError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(
        os.getenv("COMFYUI_BASE_URL", "").strip()
        and os.getenv("COMFYUI_WORKFLOW_PATH", "").strip()
        and os.getenv("COMFYUI_PROMPT_NODE_ID", "").strip()
        and os.getenv("COMFYUI_PROMPT_INPUT", "text").strip()
    )


def generate_video(prompt: str, timeout_seconds: int = 240) -> tuple[bytes, str]:
    """Submit a configured ComfyUI workflow and return its first video output bytes."""
    if not is_configured():
        raise ProviderNotConfigured(
            "Set COMFYUI_BASE_URL, COMFYUI_WORKFLOW_PATH, COMFYUI_PROMPT_NODE_ID, "
            "and COMFYUI_PROMPT_INPUT to enable ComfyUI generation."
        )

    base_url = os.environ["COMFYUI_BASE_URL"].rstrip("/")
    workflow_path = Path(os.environ["COMFYUI_WORKFLOW_PATH"])
    node_id = os.environ["COMFYUI_PROMPT_NODE_ID"]
    input_name = os.getenv("COMFYUI_PROMPT_INPUT", "text")
    if not workflow_path.is_file():
        raise ProviderNotConfigured("The configured ComfyUI workflow JSON file was not found.")

    try:
        workflow: dict[str, Any] = json.loads(workflow_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProviderNotConfigured("The ComfyUI workflow file is unreadable or invalid JSON.") from exc

    node = workflow.get(node_id)
    if not isinstance(node, dict) or not isinstance(node.get("inputs"), dict):
        raise ProviderNotConfigured(f"Prompt node {node_id!r} is missing from the API workflow.")
    if input_name not in node["inputs"]:
        raise ProviderNotConfigured(
            f"Prompt input {input_name!r} is missing from workflow node {node_id!r}."
        )
    workflow = copy.deepcopy(workflow)
    workflow[node_id]["inputs"][input_name] = prompt

    try:
        with httpx.Client(timeout=httpx.Timeout(20.0, read=timeout_seconds)) as client:
            queued = client.post(f"{base_url}/prompt", json={"prompt": workflow})
            queued.raise_for_status()
            prompt_id = queued.json().get("prompt_id")
            if not isinstance(prompt_id, str) or not prompt_id:
                raise ProviderGenerationError("ComfyUI did not return a prompt_id.")

            deadline = time.monotonic() + timeout_seconds
            history: dict[str, Any] = {}
            while time.monotonic() < deadline:
                response = client.get(f"{base_url}/history/{prompt_id}")
                response.raise_for_status()
                history = response.json().get(prompt_id, {})
                status = history.get("status", {})
                if status.get("status_str") == "error" or status.get("completed") is False and status.get("messages") and any(
                    isinstance(message, list) and message and message[0] == "execution_error"
                    for message in status.get("messages", [])
                ):
                    raise ProviderGenerationError("ComfyUI reported a workflow execution error.")
                if history.get("outputs"):
                    break
                time.sleep(2)
            else:
                raise ProviderGenerationError("ComfyUI generation timed out before producing output.")

            candidates: list[dict[str, Any]] = []
            for output in history.get("outputs", {}).values():
                if not isinstance(output, dict):
                    continue
                values = output.get("videos", [])
                if isinstance(values, list):
                    candidates.extend(
                        item for item in values
                        if isinstance(item, dict)
                        and isinstance(item.get("filename"), str)
                        and Path(item["filename"]).suffix.lower() in SUPPORTED_VIDEO_SUFFIXES
                    )
            if not candidates:
                raise ProviderGenerationError(
                    "The workflow completed but returned no video output. Check its video output node."
                )
            asset = candidates[0]
            filename = asset.get("filename")
            if not isinstance(filename, str) or not filename:
                raise ProviderGenerationError("ComfyUI returned a video asset without a filename.")
            params = {
                "filename": filename,
                "subfolder": asset.get("subfolder", ""),
                "type": asset.get("type", "output"),
            }
            media = client.get(f"{base_url}/view", params=params)
            media.raise_for_status()
            content_type = media.headers.get("content-type", "").split(";", 1)[0].strip().lower()
            suffix = Path(filename).suffix.lower()
            if suffix not in SUPPORTED_VIDEO_SUFFIXES:
                raise ProviderGenerationError("ComfyUI output has an unsupported video container.")
            if content_type and not content_type.startswith("video/") and content_type != "application/octet-stream":
                raise ProviderGenerationError("ComfyUI returned a non-video content type.")
            if not _looks_like_video_payload(media.content, suffix):
                raise ProviderGenerationError("ComfyUI output failed the basic video-container signature check.")
            return media.content, suffix
    except ProviderGenerationError:
        raise
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        raise ProviderGenerationError(f"Could not complete the ComfyUI request: {type(exc).__name__}.") from exc
