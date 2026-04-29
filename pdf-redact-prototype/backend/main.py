import asyncio
import io
import logging
import time
import uuid
from pathlib import Path

import fitz
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Redact Prototype")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
FILE_TTL_SECONDS = 3600  # clean up files older than 1 hour


def _cleanup_old_files() -> None:
    now = time.time()
    for f in UPLOAD_DIR.glob("*.pdf"):
        if now - f.stat().st_mtime > FILE_TTL_SECONDS:
            f.unlink(missing_ok=True)
            logger.info("Cleaned up expired file: %s", f.name)


@app.on_event("startup")
async def startup_cleanup() -> None:
    _cleanup_old_files()


# ── Models ────────────────────────────────────────────────────────────────────

class PageInfo(BaseModel):
    page_index: int
    width_pt: float
    height_pt: float


class UploadResponse(BaseModel):
    file_id: str
    page_count: int
    pages: list[PageInfo]


class RedactionBox(BaseModel):
    page_index: int
    x0: float
    y0: float
    x1: float
    y1: float


class RedactRequest(BaseModel):
    file_id: str
    redactions: list[RedactionBox]
    strip_metadata: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> UploadResponse:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        # also accept octet-stream in case browser sends that
        pass
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB).")

    file_id = str(uuid.uuid4())
    dest = UPLOAD_DIR / f"{file_id}.pdf"
    dest.write_bytes(content)

    try:
        doc = fitz.open(stream=content, filetype="pdf")
        pages = [
            PageInfo(
                page_index=i,
                width_pt=page.rect.width,
                height_pt=page.rect.height,
            )
            for i, page in enumerate(doc)
        ]
        doc.close()
    except Exception as exc:
        dest.unlink(missing_ok=True)
        logger.exception("Failed to open PDF")
        raise HTTPException(status_code=422, detail="Could not parse PDF.") from exc

    background_tasks.add_task(_cleanup_old_files)

    return UploadResponse(file_id=file_id, page_count=len(pages), pages=pages)


@app.post("/redact")
def apply_redactions(req: RedactRequest) -> StreamingResponse:
    src = UPLOAD_DIR / f"{req.file_id}.pdf"
    if not src.exists():
        raise HTTPException(status_code=404, detail="File not found or expired.")

    try:
        doc = fitz.open(src)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not open PDF.") from exc

    # Group redactions by page for efficiency
    by_page: dict[int, list[RedactionBox]] = {}
    for box in req.redactions:
        by_page.setdefault(box.page_index, []).append(box)

    for page_idx, boxes in by_page.items():
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]
        for box in boxes:
            rect = fitz.Rect(box.x0, box.y0, box.x1, box.y1)
            page.add_redact_annot(rect, fill=(0, 0, 0))
        # graphics=True also redacts images beneath the box
        page.apply_redactions()

    if req.strip_metadata:
        doc.set_metadata({})
        try:
            doc.del_xml_metadata()
        except Exception:
            pass  # not all PDFs have XMP metadata

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True, clean=True)
    doc.close()
    buf.seek(0)

    short_id = req.file_id[:8]
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="redacted_{short_id}.pdf"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
