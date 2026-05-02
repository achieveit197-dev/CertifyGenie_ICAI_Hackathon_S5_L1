"""
Redact-Check Router
-------------------
POST /api/redact-check          — Accept a PDF, auto-redact PII, return PDF.
GET  /api/preview-redacted/{id} — Return auto-redacted PDF for interactive preview.
POST /api/redact-manual/{id}    — Apply auto + manual boxes, return final PDF.
"""
import logging
import os
import re

import fitz
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List

from config import get_settings
from models.request_models import ManualRedactionBox
from services.redaction import REDACTION_PATTERNS
from services.redaction_pdf import redact_pdf_bytes, apply_manual_boxes

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

_MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def _find_uploaded_file(file_id: str) -> str:
    upload_dir = settings.upload_dir
    if not os.path.isdir(upload_dir):
        raise FileNotFoundError("Upload directory not found")
    for fname in os.listdir(upload_dir):
        if fname.startswith(file_id):
            return os.path.join(upload_dir, fname)
    raise FileNotFoundError(f"File not found for id: {file_id}")


def _summary_header(counts: dict[str, int]) -> str:
    total = sum(counts.values())
    return (
        f"CIN:{counts.get('CIN', 0)} PAN:{counts.get('PAN', 0)} "
        f"GSTIN:{counts.get('GSTIN', 0)} AADHAAR:{counts.get('AADHAAR', 0)} "
        f"MOBILE:{counts.get('MOBILE', 0)} EMAIL:{counts.get('EMAIL', 0)} Total:{total}"
    )


@router.post("/redact-check")
async def redact_check(file: UploadFile = File(...)):
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    raw = await file.read()
    if len(raw) > _MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum 20 MB.")

    try:
        redacted_bytes, counts = redact_pdf_bytes(raw)
    except Exception as exc:
        logger.error("PDF redaction failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Redaction failed: {exc}")

    original_name = (file.filename or "document").rsplit(".", 1)[0]
    download_name = f"{original_name}_redacted.pdf"
    total = sum(counts.values())
    logger.info("Redact-check complete: %d items redacted from '%s'", total, file.filename)

    return Response(
        content=redacted_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
            "X-Redaction-Summary": _summary_header(counts),
        },
    )


@router.get("/preview-redacted/{file_id}")
async def preview_redacted(file_id: str):
    """Return auto-redacted PDF for display in the manual redaction viewer."""
    try:
        file_path = _find_uploaded_file(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"No uploaded file found for id: {file_id}")

    if not file_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files support preview redaction.")

    try:
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        redacted_bytes, counts = redact_pdf_bytes(pdf_bytes)
        doc = fitz.open(stream=redacted_bytes, filetype="pdf")
        page_count = len(doc)
        doc.close()
    except Exception as exc:
        logger.error("Preview redaction failed for %s: %s", file_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Redaction failed: {exc}")

    return Response(
        content=redacted_bytes,
        media_type="application/pdf",
        headers={
            "X-Page-Count": str(page_count),
            "X-Redaction-Summary": _summary_header(counts),
            "Access-Control-Expose-Headers": "X-Page-Count, X-Redaction-Summary",
        },
    )


@router.get("/redact-preview-coords/{file_id}")
async def redact_preview_coords(file_id: str):
    """
    Return the coordinates of PII that would be auto-redacted, WITHOUT modifying the PDF.
    Used by the frontend to render black overlay boxes on top of the original PDF canvas.
    Coordinates are in PyMuPDF screen space (top-left origin, y increases downward).
    """
    try:
        file_path = _find_uploaded_file(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"No uploaded file found for id: {file_id}")

    if not file_path.lower().endswith(".pdf"):
        return {"boxes": []}

    try:
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        boxes = []
        seen: set[tuple] = set()
        for page in doc:
            for _label, pattern, _ in REDACTION_PATTERNS:
                text = page.get_text("text")
                for match in re.finditer(pattern, text):
                    matched_str = match.group(0)
                    for quad in page.search_for(matched_str, quads=True):
                        rect = quad.rect
                        key = (page.number, round(rect.x0, 1), round(rect.y0, 1))
                        if key in seen:
                            continue
                        seen.add(key)
                        boxes.append({
                            "page_index": page.number,
                            "x0": rect.x0,
                            "y0": rect.y0,
                            "x1": rect.x1,
                            "y1": rect.y1,
                        })
        doc.close()
        logger.info("Preview coords: %d boxes found for %s", len(boxes), file_id)
    except Exception as exc:
        logger.error("Preview coords failed for %s: %s", file_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

    return {"boxes": boxes}


class ManualRedactRequest(BaseModel):
    manual_boxes: List[ManualRedactionBox] = []
    strip_metadata: bool = False


@router.post("/redact-manual/{file_id}")
async def redact_manual(file_id: str, req: ManualRedactRequest):
    """Apply auto + manual redaction and return the final PDF for download."""
    try:
        file_path = _find_uploaded_file(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"No uploaded file found for id: {file_id}")

    if not file_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are supported.")

    try:
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        auto_bytes, counts = redact_pdf_bytes(pdf_bytes)
        if req.manual_boxes:
            final_bytes = apply_manual_boxes(auto_bytes, req.manual_boxes)
        else:
            final_bytes = auto_bytes

        if req.strip_metadata:
            import io
            doc = fitz.open(stream=final_bytes, filetype="pdf")
            doc.set_metadata({})
            try:
                doc.del_xml_metadata()
            except Exception:
                pass
            buf = io.BytesIO()
            doc.save(buf, garbage=4, deflate=True, clean=True)
            doc.close()
            final_bytes = buf.getvalue()

    except Exception as exc:
        logger.error("Manual redaction failed for %s: %s", file_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Redaction failed: {exc}")

    short_id = file_id[:8]
    total = sum(counts.values())
    logger.info(
        "Manual redact complete: %d auto + %d manual boxes for %s",
        total, len(req.manual_boxes), file_id,
    )

    return Response(
        content=final_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="redacted_{short_id}.pdf"',
            "X-Redaction-Summary": _summary_header(counts),
            "Access-Control-Expose-Headers": "X-Redaction-Summary",
        },
    )
