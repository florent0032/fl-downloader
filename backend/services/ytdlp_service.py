import asyncio
import logging
import os
import re
import subprocess
import threading
from datetime import datetime, timezone
from typing import Optional

from yt_dlp import YoutubeDL

logger = logging.getLogger("yt-dlp-web")


def _has_ffmpeg() -> bool:
    """Check if ffmpeg is available on the system."""
    import shutil
    return shutil.which("ffmpeg") is not None


def _needs_merge(fmt: str | None) -> bool:
    """Check if a format string requires ffmpeg merging (contains +)."""
    if not fmt:
        return False
    return "+" in fmt


def get_ytdlp_version() -> dict:
    """Get yt-dlp version info."""
    try:
        result = subprocess.run(
            ["yt-dlp", "--version"],
            capture_output=True, text=True, timeout=10
        )
        version = result.stdout.strip() if result.returncode == 0 else None
        return {"installed": result.returncode == 0, "version": version}
    except FileNotFoundError:
        return {"installed": False, "version": None}
    except Exception as e:
        return {"installed": False, "version": None, "error": str(e)}


def update_ytdlp(channel: str = "stable") -> dict:
    """Update yt-dlp to latest version."""
    try:
        cmd = ["pip", "install", "--upgrade", "yt-dlp"]
        if channel == "nightly":
            cmd = ["pip", "install", "--upgrade", "yt-dlp-nightly"]
        elif channel == "master":
            cmd = ["pip", "install", "--upgrade",
                   "https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz"]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            ver = get_ytdlp_version()
            return {"success": True, "version": ver.get("version"), "output": result.stdout[-500:]}
        return {"success": False, "error": result.stderr[-500:]}
    except Exception as e:
        return {"success": False, "error": str(e)}


def parse_video(url: str) -> dict:
    """Parse video info without downloading. Returns format list and metadata."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "no_color": True,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if info is None:
        raise ValueError("Could not extract video info")

    # Handle playlists - just take first entry info for display
    if "entries" in info:
        entries = list(info["entries"])
        if not entries:
            raise ValueError("Playlist is empty")
        info = entries[0] if entries else info

    # Build format list
    formats = []
    seen = set()
    for f in info.get("formats", []):
        fid = f.get("format_id", "")
        if fid in seen:
            continue
        seen.add(fid)

        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        is_video = vcodec and vcodec != "none"
        is_audio = acodec and acodec != "none"

        # Determine type
        if is_video and is_audio:
            fmt_type = "video+audio"
        elif is_video:
            fmt_type = "video"
        elif is_audio:
            fmt_type = "audio"
        else:
            fmt_type = "unknown"

        formats.append({
            "format_id": fid,
            "ext": f.get("ext"),
            "resolution": f.get("resolution", "audio only" if not is_video else "unknown"),
            "width": f.get("width"),
            "height": f.get("height"),
            "fps": f.get("fps"),
            "vcodec": vcodec,
            "acodec": acodec,
            "tbr": f.get("tbr"),
            "vbr": f.get("vbr"),
            "abr": f.get("abr"),
            "filesize": f.get("filesize") or f.get("filesize_approx"),
            "format_note": f.get("format_note", ""),
            "type": fmt_type,
            "protocol": f.get("protocol", ""),
        })

    # Extract chapters
    chapters = []
    for ch in info.get("chapters") or []:
        chapters.append({
            "start": ch.get("start_time"),
            "end": ch.get("end_time"),
            "title": ch.get("title"),
        })

    return {
        "url": url,
        "title": info.get("title", "Unknown"),
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "uploader": info.get("uploader"),
        "webpage_url": info.get("webpage_url", url),
        "description": (info.get("description") or "")[:500],
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "upload_date": info.get("upload_date"),
        "formats": formats,
        "chapters": chapters,
        "extractor": info.get("extractor"),
        "original_url": info.get("original_url", url),
    }


class DownloadTask:
    """Manages a single download with progress tracking."""

    def __init__(self, record_id: str, url: str, options: dict, db_session_factory):
        self.record_id = record_id
        self.url = url
        self.options = options
        self.db_session_factory = db_session_factory
        self.status = "pending"
        self.progress = 0
        self.speed = ""
        self.eta = ""
        self.error = None
        self._thread: Optional[threading.Thread] = None
        self._cancelled = False

    def _progress_hook(self, d):
        if self._cancelled:
            raise Exception("Download cancelled")

        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            if total > 0:
                self.progress = min(downloaded / total * 100, 99.9)
            self.speed = d.get("_speed_str", "").strip()
            self.eta = d.get("_eta_str", "").strip()
            self._update_db()

        elif d["status"] == "finished":
            self.progress = 100
            self.status = "completed"
            self._update_db()

    def _update_db(self):
        try:
            db = self.db_session_factory()
            try:
                from models import DownloadRecord
                record = db.query(DownloadRecord).filter(
                    DownloadRecord.id == self.record_id).first()
                if record:
                    record.progress = self.progress
                    record.speed = self.speed
                    record.eta = self.eta
                    record.status = self.status
                    if self.status == "completed":
                        record.completed_at = datetime.now(timezone.utc)
                        # Try to find the output filename
                        if record.save_path and record.title:
                            for ext in ["mp4", "mkv", "webm", "mp3", "m4a", "opus", "flac", "wav"]:
                                candidate = os.path.join(record.save_path, f"{record.title}.{ext}")
                                if os.path.exists(candidate):
                                    record.filename = os.path.basename(candidate)
                                    break
                    if self.error:
                        record.error_message = self.error
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"DB update error: {e}")

    def start(self):
        self.status = "downloading"
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def cancel(self):
        self._cancelled = True

    def _run(self):
        try:
            save_path = self.options.get("save_path", "./downloads")
            os.makedirs(save_path, exist_ok=True)

            ydl_opts = {
                "outtmpl": os.path.join(save_path, "%(title)s.%(ext)s"),
                "progress_hooks": [self._progress_hook],
                "quiet": True,
                "no_warnings": True,
                "no_color": True,
            }

            # Format selection
            fmt = self.options.get("format")
            has_ffmpeg = _has_ffmpeg()

            if fmt:
                # If format requires merging (+) but ffmpeg is missing, fall back
                if _needs_merge(fmt) and not has_ffmpeg:
                    logger.warning("ffmpeg not found, falling back to single-stream format")
                    ydl_opts["format"] = "best"
                else:
                    ydl_opts["format"] = fmt

            # Merge output format (requires ffmpeg)
            merge_fmt = self.options.get("merge_output_format")
            if merge_fmt and has_ffmpeg:
                ydl_opts["merge_output_format"] = merge_fmt

            # Audio extraction (requires ffmpeg)
            if self.options.get("extract_audio"):
                if has_ffmpeg:
                    ydl_opts["extract_audio"] = True
                    ydl_opts["audioformat"] = self.options.get("audio_format", "mp3")
                    ydl_opts["audioquality"] = self.options.get("audio_quality", "5")
                else:
                    logger.warning("Audio extraction requires ffmpeg, skipping")

            # Remux (requires ffmpeg)
            remux = self.options.get("remux_video")
            if remux and has_ffmpeg:
                ydl_opts["postprocessors"] = ydl_opts.get("postprocessors", [])
                ydl_opts["postprocessors"].append({
                    "key": "FFmpegVideoRemuxer",
                    "preferedformat": remux,
                })

            # Subtitles
            if self.options.get("write_subs"):
                ydl_opts["writesubtitles"] = True
                ydl_opts["subtitleslangs"] = self.options.get("sub_langs", ["en"])
                ydl_opts["subtitlesformat"] = self.options.get("sub_format", "srt")
            if self.options.get("write_auto_subs"):
                ydl_opts["writeautomaticsub"] = True

            # Embed options (most require ffmpeg)
            if self.options.get("embed_metadata") and has_ffmpeg:
                ydl_opts["postprocessors"] = ydl_opts.get("postprocessors", [])
                ydl_opts["postprocessors"].append({"key": "FFmpegMetadata"})
            if self.options.get("embed_thumbnail"):
                ydl_opts["writethumbnail"] = True
                if has_ffmpeg:
                    ydl_opts["postprocessors"] = ydl_opts.get("postprocessors", [])
                    ydl_opts["postprocessors"].append({"key": "EmbedThumbnail"})
            if self.options.get("embed_subs") and has_ffmpeg:
                ydl_opts["postprocessors"] = ydl_opts.get("postprocessors", [])
                ydl_opts["postprocessors"].append({"key": "FFmpegEmbedSubtitle"})

            # Thumbnail
            if self.options.get("write_thumbnail"):
                ydl_opts["writethumbnail"] = True

            # Download rate limit
            rate_limit = self.options.get("limit_rate")
            if rate_limit:
                ydl_opts["ratelimit"] = _parse_rate_limit(rate_limit)

            # Concurrent fragments
            concurrent = self.options.get("concurrent_fragments")
            if concurrent:
                ydl_opts["concurrent_fragment_downloads"] = int(concurrent)

            # Retries
            retries = self.options.get("retries")
            if retries is not None:
                ydl_opts["retries"] = int(retries)

            # Proxy
            proxy = self.options.get("proxy")
            if proxy:
                ydl_opts["proxy"] = proxy

            with YoutubeDL(ydl_opts) as ydl:
                ydl.download([self.url])

            if self.status != "completed":
                self.status = "completed"
                self.progress = 100
                self._update_db()

        except Exception as e:
            self.status = "failed"
            self.error = str(e)[:500]
            self._update_db()
            logger.error(f"Download failed for {self.url}: {e}")


def _parse_rate_limit(rate_str: str) -> int:
    """Parse rate limit string like '50K', '4.2M' to bytes/sec."""
    rate_str = rate_str.strip().upper()
    multipliers = {"K": 1024, "M": 1024 * 1024, "G": 1024 * 1024 * 1024}
    for suffix, mult in multipliers.items():
        if rate_str.endswith(suffix):
            return int(float(rate_str[:-1]) * mult)
    return int(rate_str)


# Active downloads registry
_active_downloads: dict[str, DownloadTask] = {}


def get_active_download(record_id: str) -> Optional[DownloadTask]:
    return _active_downloads.get(record_id)


def register_download(task: DownloadTask):
    _active_downloads[task.record_id] = task


def remove_download(record_id: str):
    _active_downloads.pop(record_id, None)
