import glob
import os
import subprocess

from fastapi import APIRouter

from services.ytdlp_service import get_ytdlp_version, update_ytdlp

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/ytdlp")
async def get_ytdlp_info():
    """Get yt-dlp installation status and version."""
    info = get_ytdlp_version()

    # Also get ffmpeg status
    ffmpeg_info = {"installed": False, "version": None}
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            ffmpeg_info["installed"] = True
            first_line = result.stdout.split("\n")[0]
            ffmpeg_info["version"] = first_line
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return {
        "ytdlp": info,
        "ffmpeg": ffmpeg_info,
    }


@router.post("/ytdlp/update")
async def api_update_ytdlp(channel: str = "stable"):
    """Install or update yt-dlp."""
    result = update_ytdlp(channel)
    return result


@router.get("/logs")
async def get_logs(lines: int = 200):
    """Get recent application logs."""
    log_file = "data/yt-dlp-web.log"
    if not os.path.exists(log_file):
        return {"logs": [], "log_file": log_file}

    try:
        with open(log_file, "r") as f:
            all_lines = f.readlines()
            recent = all_lines[-lines:]
        return {"logs": [line.rstrip() for line in recent], "log_file": log_file}
    except Exception as e:
        return {"logs": [f"Error reading log: {e}"], "log_file": log_file}


@router.get("/download-path")
async def get_download_path():
    """Get the default download path."""
    default_path = os.path.abspath("./downloads")
    os.makedirs(default_path, exist_ok=True)
    return {"path": default_path}
