"""
Upload Router
-------------
POST /api/upload — Accept PDF or Excel files, validate, store with UUID filename.
"""
import logging
import mimetypes
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status

from config import get_settings
from models.response_models import UploadResponse

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".xlsx", ".xls"}
ALLOWED_MIMETYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}


def _detect_file_type(filename: str, content_type: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in {".xlsx", ".xls"}:
        return "excel"
    raise ValueError(f"Unsupported extension: {ext}")


def _sanitize_filename(name: str) -> str:
    """Remove path traversal characters and unsafe chars."""
    safe = Path(name).name
    safe = "".join(c for c in safe if c.isalnum() or c in "._- ")
    return safe[:100]


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...)):
    # Extension check
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ext}'. Accepted: PDF, XLSX, XLS",
        )

    # Read file content
    content = await file.read()
    size = len(content)

    if size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {settings.max_file_size_mb}MB limit. Please compress and retry.",
        )

    # Determine file type
    try:
        file_type = _detect_file_type(file.filename or "", file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc))

    # Store with UUID filename to prevent collisions and path traversal
    file_id = uuid.uuid4().hex
    safe_name = _sanitize_filename(file.filename or "upload")
    stored_filename = f"{file_id}{ext}"
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    logger.info("Uploaded: %s → %s (%d bytes)", safe_name, stored_filename, size)

    return UploadResponse(
        file_id=file_id,
        filename=safe_name,
        file_type=file_type,
        size_bytes=size,
    )
