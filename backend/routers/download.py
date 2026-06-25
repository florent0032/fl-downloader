import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import DownloadRecord, get_db
from services.ytdlp_service import (
    DownloadTask,
    get_active_download,
    parse_video,
    register_download,
    remove_download,
)

router = APIRouter(prefix="/api", tags=["download"])


class ParseRequest(BaseModel):
    url: str


class DownloadRequest(BaseModel):
    url: str
    title: str | None = None
    thumbnail: str | None = None
    duration: int | None = None
    uploader: str | None = None
    webpage_url: str | None = None

    # Format
    format: str | None = None
    format_note: str | None = None
    ext: str | None = None
    resolution: str | None = None
    vcodec: str | None = None
    acodec: str | None = None
    fps: int | None = None
    filesize: int | None = None
    tbr: float | None = None
    merge_output_format: str | None = None

    # Save location
    save_path: str | None = None

    # Post-processing
    extract_audio: bool = False
    audio_format: str | None = None
    audio_quality: str | None = None
    remux_video: str | None = None

    # Subtitles
    write_subs: bool = False
    write_auto_subs: bool = False
    sub_langs: list[str] | None = None
    sub_format: str | None = None

    # Embed options
    embed_metadata: bool = False
    embed_thumbnail: bool = False
    embed_subs: bool = False
    write_thumbnail: bool = False

    # Download options
    limit_rate: str | None = None
    concurrent_fragments: int | None = None
    retries: int | None = None
    proxy: str | None = None


@router.post("/parse")
async def api_parse(req: ParseRequest):
    """Parse a URL and return video info with available formats."""
    try:
        info = parse_video(req.url)
        return {"success": True, "data": info}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/download")
async def api_download(req: DownloadRequest, db: Session = Depends(get_db)):
    """Start a download task."""
    record_id = str(uuid.uuid4())

    # Create DB record
    record = DownloadRecord(
        id=record_id,
        url=req.url,
        title=req.title,
        thumbnail=req.thumbnail,
        duration=req.duration,
        uploader=req.uploader,
        webpage_url=req.webpage_url or req.url,
        format_id=req.format,
        format_note=req.format_note,
        ext=req.ext,
        resolution=req.resolution,
        vcodec=req.vcodec,
        acodec=req.acodec,
        fps=req.fps,
        filesize=req.filesize,
        tbr=req.tbr,
        save_path=req.save_path or "./downloads",
        status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Build options dict for the download task
    options = {
        "format": req.format,
        "merge_output_format": req.merge_output_format,
        "save_path": req.save_path or "./downloads",
        "extract_audio": req.extract_audio,
        "audio_format": req.audio_format,
        "audio_quality": req.audio_quality,
        "remux_video": req.remux_video,
        "write_subs": req.write_subs,
        "write_auto_subs": req.write_auto_subs,
        "sub_langs": req.sub_langs,
        "sub_format": req.sub_format,
        "embed_metadata": req.embed_metadata,
        "embed_thumbnail": req.embed_thumbnail,
        "embed_subs": req.embed_subs,
        "write_thumbnail": req.write_thumbnail,
        "limit_rate": req.limit_rate,
        "concurrent_fragments": req.concurrent_fragments,
        "retries": req.retries,
        "proxy": req.proxy,
    }

    # Create and start download task
    task = DownloadTask(record_id, req.url, options, SessionLocal_factory)
    register_download(task)
    task.start()

    return {"success": True, "record_id": record_id, "status": "pending"}


def SessionLocal_factory():
    from models import SessionLocal
    return SessionLocal()


@router.get("/download/{record_id}/status")
async def api_download_status(record_id: str, db: Session = Depends(get_db)):
    """SSE endpoint for real-time download progress."""
    record = db.query(DownloadRecord).filter(DownloadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    async def event_stream():
        while True:
            # Refresh from DB
            db2 = SessionLocal_factory()
            try:
                rec = db2.query(DownloadRecord).filter(
                    DownloadRecord.id == record_id).first()
                if not rec:
                    break

                data = {
                    "status": rec.status,
                    "progress": rec.progress,
                    "speed": rec.speed,
                    "eta": rec.eta,
                    "error": rec.error_message,
                    "filename": rec.filename,
                }
                yield f"data: {json.dumps(data)}\n\n"

                if rec.status in ("completed", "failed"):
                    remove_download(record_id)
                    break
            finally:
                db2.close()

            time.sleep(0.5)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
