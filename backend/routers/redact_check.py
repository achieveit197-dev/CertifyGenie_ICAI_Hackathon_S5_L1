"""
Redact-Check Router
-------------------
POST /api/redact-check  — Accept a PDF, redact PII, return redacted PDF.
No AI processing. Pure regex + PyMuPDF redaction.
"""
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from services.redaction_pdf import redact_pdf_bytes

logger = logging.getLogger(__name__)
router = APIRouter()

_MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/redact-check")
async def redact_check(file: UploadFile = File(...)):
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        # Be lenient — browsers sometimes send octet-stream for PDFs
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
            "X-Redaction-Summary": (
                f"CIN:{counts['CIN']} PAN:{counts['PAN']} GSTIN:{counts['GSTIN']} "
                f"AADHAAR:{counts['AADHAAR']} MOBILE:{counts['MOBILE']} "
                f"EMAIL:{counts['EMAIL']} Total:{total}"
            ),
        },
    )
