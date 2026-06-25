import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import DownloadRecord, get_db
from services.ytdlp_service import get_active_download

router = APIRouter(prefix="/api/records", tags=["records"])


class RecordListResponse(BaseModel):
    records: list[dict]
    total: int
    page: int
    page_size: int


@router.get("")
async def list_records(
    status: str | None = Query(None, description="Filter by status"),
    search: str | None = Query(None, description="Search in title/url"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List download records with optional filters."""
    query = db.query(DownloadRecord)

    if status and status != "all":
        query = query.filter(DownloadRecord.status == status)

    if search:
        query = query.filter(
            DownloadRecord.title.ilike(f"%{search}%")
            | DownloadRecord.url.ilike(f"%{search}%")
        )

    total = query.count()
    records = (
        query.order_by(DownloadRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "records": [_record_to_dict(r) for r in records],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{record_id}")
async def get_record(record_id: str, db: Session = Depends(get_db)):
    """Get a single record detail."""
    record = db.query(DownloadRecord).filter(DownloadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"record": _record_to_dict(record)}


@router.delete("/{record_id}")
async def delete_record(
    record_id: str,
    delete_file: bool = Query(False, description="Also delete the source file"),
    db: Session = Depends(get_db),
):
    """Delete a record and optionally its source file."""
    record = db.query(DownloadRecord).filter(DownloadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    file_deleted = False
    if delete_file and record.filename and record.save_path:
        filepath = os.path.join(record.save_path, record.filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                file_deleted = True
            except OSError:
                pass

    db.delete(record)
    db.commit()
    return {"success": True, "file_deleted": file_deleted}


class BatchDeleteRequest(BaseModel):
    record_ids: list[str]
    delete_files: bool = False


@router.post("/batch-delete")
async def batch_delete_records(
    req: BatchDeleteRequest,
    db: Session = Depends(get_db),
):
    """Batch delete records and optionally their source files."""
    deleted_count = 0
    files_deleted = 0

    for record_id in req.record_ids:
        record = db.query(DownloadRecord).filter(
            DownloadRecord.id == record_id).first()
        if not record:
            continue

        if req.delete_files and record.filename and record.save_path:
            filepath = os.path.join(record.save_path, record.filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                    files_deleted += 1
                except OSError:
                    pass

        db.delete(record)
        deleted_count += 1

    db.commit()
    return {
        "success": True,
        "deleted_count": deleted_count,
        "files_deleted": files_deleted,
    }


@router.get("/{record_id}/file-info")
async def get_file_info(record_id: str, db: Session = Depends(get_db)):
    """Get file location info."""
    record = db.query(DownloadRecord).filter(DownloadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    file_exists = False
    file_size = None
    if record.filename and record.save_path:
        filepath = os.path.join(record.save_path, record.filename)
        if os.path.exists(filepath):
            file_exists = True
            file_size = os.path.getsize(filepath)

    return {
        "save_path": record.save_path,
        "filename": record.filename,
        "file_exists": file_exists,
        "file_size": file_size,
        "full_path": os.path.join(record.save_path, record.filename) if record.filename and record.save_path else None,
    }


@router.get("/{record_id}/open-folder")
async def open_file_folder(record_id: str, db: Session = Depends(get_db)):
    """Open the folder containing the downloaded file in the system file manager."""
    record = db.query(DownloadRecord).filter(DownloadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if not record.save_path or not record.filename:
        raise HTTPException(status_code=400, detail="No file path available")

    full_path = os.path.join(record.save_path, record.filename)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    folder = os.path.dirname(os.path.abspath(full_path))

    try:
        if sys.platform == "darwin":
            subprocess.Popen(["open", folder])
        elif sys.platform == "win32":
            subprocess.Popen(["explorer", folder])
        else:
            subprocess.Popen(["xdg-open", folder])
        return {"success": True, "opened": folder}
    except Exception as e:
        return {"success": False, "error": str(e), "path": folder}


def _record_to_dict(r: DownloadRecord) -> dict:
    return {
        "id": r.id,
        "url": r.url,
        "title": r.title,
        "thumbnail": r.thumbnail,
        "duration": r.duration,
        "uploader": r.uploader,
        "webpage_url": r.webpage_url,
        "format_id": r.format_id,
        "format_note": r.format_note,
        "ext": r.ext,
        "resolution": r.resolution,
        "vcodec": r.vcodec,
        "acodec": r.acodec,
        "fps": r.fps,
        "filesize": r.filesize,
        "tbr": r.tbr,
        "save_path": r.save_path,
        "filename": r.filename,
        "status": r.status,
        "progress": r.progress,
        "speed": r.speed,
        "eta": r.eta,
        "error_message": r.error_message,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }
