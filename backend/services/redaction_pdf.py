"""
PDF Redaction Service
---------------------
Uses PyMuPDF (fitz) to visually redact PII from a PDF file.
Scans each page for regex matches, adds redaction annotations,
then applies them (text removed + black box drawn in place).
No AI involved — pure regex + PyMuPDF.
"""
import io
import logging
import re

import fitz  # PyMuPDF

from services.redaction import REDACTION_PATTERNS

logger = logging.getLogger(__name__)


def redact_pdf_bytes(pdf_bytes: bytes) -> tuple[bytes, dict[str, int]]:
    """
    Redact PII from a PDF supplied as raw bytes.

    Returns:
        (redacted_pdf_bytes, counts)  — counts is {label: int} per PII type
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    counts: dict[str, int] = {label: 0 for label, _, _ in REDACTION_PATTERNS}

    any_redactions = False
    for page in doc:
        page_had_annots = False
        for label, pattern, _ in REDACTION_PATTERNS:
            text = page.get_text("text")
            for match in re.finditer(pattern, text):
                matched_str = match.group(0)
                quads = page.search_for(matched_str, quads=True)
                for quad in quads:
                    page.add_redact_annot(quad, fill=(0, 0, 0))
                    counts[label] += 1
                    page_had_annots = True
                    logger.debug("Redacting %s on page %d: %s", label, page.number + 1, matched_str)

        if page_had_annots:
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)
            any_redactions = True

    total = sum(counts.values())
    logger.info(
        "PDF redaction complete — PAN:%d GSTIN:%d AADHAAR:%d MOBILE:%d EMAIL:%d (total %d)",
        counts["PAN"], counts["GSTIN"], counts["AADHAAR"], counts["MOBILE"], counts["EMAIL"], total,
    )

    # If nothing was redacted, return the original bytes untouched — no PyMuPDF rewrite.
    if not any_redactions:
        doc.close()
        return pdf_bytes, counts

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True)
    doc.close()
    return buf.getvalue(), counts


def apply_manual_boxes(pdf_bytes: bytes, boxes: list) -> bytes:
    """
    Apply user-drawn redaction boxes on top of an already-redacted PDF.

    boxes: list of objects with page_index, x0, y0, x1, y1 (PDF points).
    Returns new PDF bytes with black boxes permanently applied.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    by_page: dict[int, list] = {}
    for box in boxes:
        idx = box.page_index if hasattr(box, "page_index") else box["page_index"]
        by_page.setdefault(idx, []).append(box)

    for page_idx, page_boxes in by_page.items():
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]
        for box in page_boxes:
            if hasattr(box, "x0"):
                rect = fitz.Rect(box.x0, box.y0, box.x1, box.y1)
            else:
                rect = fitz.Rect(box["x0"], box["y0"], box["x1"], box["y1"])
            page.add_redact_annot(rect, fill=(0, 0, 0))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True)
    doc.close()
    logger.info("Applied %d manual redaction boxes", sum(len(v) for v in by_page.values()))
    return buf.getvalue()
