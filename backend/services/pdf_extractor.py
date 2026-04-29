"""
PDF Extraction Service
----------------------
Primary: PyMuPDF (fitz) text extraction
Fallback: Convert page to base64 PNG for Claude Vision (scanned PDFs)
"""
import base64
import io
import logging
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> Tuple[str, bool]:
    """
    Extract text from a PDF file.
    Returns (text, is_scanned).
    is_scanned=True means text extraction failed and vision fallback is needed.
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        pages_text: list[str] = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                pages_text.append(f"--- Page {page_num + 1} ---\n{text}")

        doc.close()

        full_text = "\n\n".join(pages_text).strip()
        if len(full_text) < 50:
            logger.info("PDF appears to be scanned (minimal text). Switching to vision mode.")
            return full_text, True

        logger.info("PDF text extracted successfully (%d chars)", len(full_text))
        return full_text, False

    except Exception as exc:
        logger.warning("PyMuPDF extraction failed: %s", exc)
        return "", True


def pdf_pages_to_base64_images(file_path: str, dpi: int = 150) -> list[str]:
    """
    Convert each PDF page to a base64-encoded PNG image.
    Used when the PDF is scanned and has no text layer.
    """
    try:
        import fitz

        doc = fitz.open(file_path)
        images: list[str] = []
        mat = fitz.Matrix(dpi / 72, dpi / 72)  # Scale factor

        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=mat, alpha=False)
            png_bytes = pix.tobytes("png")
            b64 = base64.b64encode(png_bytes).decode("utf-8")
            images.append(b64)

        doc.close()
        logger.info("Converted %d PDF pages to images", len(images))
        return images

    except Exception as exc:
        logger.error("PDF to image conversion failed: %s", exc)
        return []
