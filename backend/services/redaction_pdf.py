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

    for page in doc:
        for label, pattern, _ in REDACTION_PATTERNS:
            # fitz.Page.search_for returns list of Rect quads for each match
            # We use re to find matches on the extracted text, then search page
            # for the exact matched string to get precise bounding boxes.
            text = page.get_text("text")
            for match in re.finditer(pattern, text):
                matched_str = match.group(0)
                quads = page.search_for(matched_str, quads=True)
                for quad in quads:
                    page.add_redact_annot(quad, fill=(0, 0, 0))
                    counts[label] += 1
                    logger.debug("Redacting %s on page %d: %s", label, page.number + 1, matched_str)

        page.apply_redactions()

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True)
    doc.close()

    total = sum(counts.values())
    logger.info(
        "PDF redaction complete — PAN:%d GSTIN:%d AADHAAR:%d MOBILE:%d EMAIL:%d (total %d)",
        counts["PAN"],
        counts["GSTIN"],
        counts["AADHAAR"],
        counts["MOBILE"],
        counts["EMAIL"],
        total,
    )
    return buf.getvalue(), counts
