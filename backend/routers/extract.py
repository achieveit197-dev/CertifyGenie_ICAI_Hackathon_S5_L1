"""
Extract Router
--------------
POST /api/extract/{file_id}
Runs PII redaction → document parsing → Claude extraction → validation.
"""
import logging
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from config import get_settings
from models.request_models import ExtractRequest
from models.response_models import (
    ExtractionResponse,
    ExtractedData,
    FinancialFigure,
    PreviousYearData,
    ValidationResult,
    RedactionSummary,
)
from services.redaction import RedactionService
from services.redaction_pdf import redact_pdf_bytes, apply_manual_boxes
from services.pdf_extractor import extract_text_from_pdf, pdf_pages_to_base64_images
from services.excel_extractor import extract_text_from_excel
from services.claude_service import extract_financial_data_text, extract_financial_data_vision

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

# In-memory store: file_id → {path, redaction_service, extracted_data}
# This is intentional for hackathon demo (no DB). One server process only.
_session_store: dict[str, dict] = {}


def _find_uploaded_file(file_id: str) -> str:
    """Find uploaded file path by file_id prefix."""
    upload_dir = settings.upload_dir
    if not os.path.isdir(upload_dir):
        raise FileNotFoundError("Upload directory not found")
    for fname in os.listdir(upload_dir):
        if fname.startswith(file_id):
            return os.path.join(upload_dir, fname)
    raise FileNotFoundError(f"File not found for id: {file_id}")


def _build_financial_figure(raw: dict | None, confidence: float) -> FinancialFigure | None:
    if raw is None:
        return None
    value = raw.get("value")
    source = raw.get("source_line") or ""
    if value is None:
        return FinancialFigure(value=None, source_line=source, status="not_found")
    status_val = "verified" if confidence >= 0.7 else "needs_review"
    return FinancialFigure(value=float(value), source_line=source, status=status_val)


def _validate(data: dict) -> ValidationResult:
    messages: list[str] = []
    nw_valid: bool | None = None
    bs_valid: bool | None = None
    nw_discrepancy: float | None = None
    bs_discrepancy: float | None = None

    sc = (data.get("share_capital") or {}).get("value")
    rs = (data.get("reserves_surplus") or {}).get("value")
    al = (data.get("accumulated_losses") or {}).get("value") or 0.0
    nw = (data.get("net_worth") or {}).get("value")
    ta = (data.get("total_assets") or {}).get("value")
    tl = (data.get("total_liabilities") or {}).get("value")

    if sc is not None and rs is not None and nw is not None:
        computed_nw = sc + rs - al
        nw_discrepancy = abs(computed_nw - nw)
        tolerance = max(abs(nw) * 0.01, 1.0)  # 1% tolerance
        nw_valid = nw_discrepancy <= tolerance
        if nw_valid:
            messages.append("✅ Net Worth equation verified (Share Capital + Reserves − Losses)")
        else:
            messages.append(
                f"⚠️ Net Worth mismatch: computed {computed_nw:,.0f} vs stated {nw:,.0f} "
                f"(difference: {nw_discrepancy:,.0f})"
            )

    if ta is not None and tl is not None:
        # Correct BS equation: Assets = External Liabilities + Shareholders' Equity (Net Worth)
        # Use stated net worth; fall back to computed if not available
        equity = nw if nw is not None else ((sc + rs - al) if sc is not None and rs is not None else 0.0)
        bs_discrepancy = abs(ta - tl - equity)
        tolerance = max(abs(ta) * 0.01, 1.0)
        bs_valid = bs_discrepancy <= tolerance
        if bs_valid:
            messages.append("✅ Balance Sheet verified (Assets = External Liabilities + Equity)")
        else:
            messages.append(
                f"⚠️ Balance Sheet mismatch: Assets {ta:,.0f} ≠ Liabilities {tl:,.0f} + Equity {equity:,.0f} "
                f"(difference: {bs_discrepancy:,.0f}) — please verify source document"
            )

    ca = (data.get("current_assets") or {}).get("value")
    cl = (data.get("current_liabilities") or {}).get("value")
    wc = (data.get("working_capital") or {}).get("value")
    if ca is not None and cl is not None:
        computed_wc = ca - cl
        if wc is not None:
            wc_disc = abs(computed_wc - wc)
            tolerance = max(abs(computed_wc) * 0.01, 1.0)
            if wc_disc <= tolerance:
                messages.append("✅ Working Capital verified (Current Assets − Current Liabilities)")
            else:
                messages.append(
                    f"⚠️ Working Capital mismatch: computed {computed_wc:,.0f} vs stated {wc:,.0f} "
                    f"(difference: {wc_disc:,.0f})"
                )

    confidence = data.get("confidence_score", 0)
    if confidence < 0.7:
        messages.append("⚠️ Low confidence score — some figures may need manual verification")

    if not messages:
        messages.append("ℹ️ Insufficient data for complete validation")

    issues = [m for m in messages if "⚠️" in m]
    if not issues and (nw_valid or bs_valid):
        overall = "pass"
    elif issues:
        overall = "warning" if (nw_valid or bs_valid) else "fail"
    else:
        overall = "warning"

    return ValidationResult(
        net_worth_equation_valid=nw_valid,
        balance_sheet_balanced=bs_valid,
        net_worth_discrepancy=nw_discrepancy,
        balance_sheet_discrepancy=bs_discrepancy,
        messages=messages,
        overall_status=overall,
    )


@router.post("/extract/{file_id}", response_model=ExtractionResponse)
async def extract_data(file_id: str, request: ExtractRequest):
    # Locate uploaded file
    try:
        file_path = _find_uploaded_file(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"No uploaded file found for id: {file_id}")

    ext = Path(file_path).suffix.lower()
    redaction_svc = RedactionService()
    extraction_mode = "text"
    tokens_used = 0
    visual_counts: dict[str, int] | None = None  # filled when manual_boxes path taken

    try:
        if ext == ".pdf" and request.manual_boxes:
            # ── Manual redaction path ────────────────────────────────────────
            # Apply auto visual redaction + user-drawn boxes, then re-extract
            logger.info("Manual redaction path — %d user boxes", len(request.manual_boxes))
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()

            auto_bytes, visual_counts = redact_pdf_bytes(pdf_bytes)
            final_bytes = apply_manual_boxes(auto_bytes, request.manual_boxes)

            import fitz as _fitz
            tmp_doc = _fitz.open(stream=final_bytes, filetype="pdf")
            raw_text = ""
            for page in tmp_doc:
                raw_text += page.get_text("text")
            tmp_doc.close()

            is_scanned = len(raw_text.strip()) < 50
            if is_scanned:
                logger.info("Redacted PDF has minimal text — using Vision mode")
                extraction_mode = "vision"
                import io as _io, base64 as _b64
                page_images = []
                tmp_doc2 = _fitz.open(stream=final_bytes, filetype="pdf")
                for page in tmp_doc2:
                    mat = _fitz.Matrix(150 / 72, 150 / 72)
                    pix = page.get_pixmap(matrix=mat)
                    img_bytes = pix.tobytes("png")
                    page_images.append(_b64.b64encode(img_bytes).decode())
                    if len(page_images) >= 5:
                        break
                tmp_doc2.close()
                if not page_images:
                    raise HTTPException(status_code=422, detail="Could not render redacted PDF pages.")
                raw_data, tokens_used = extract_financial_data_vision(page_images)
            else:
                # Text is already clean — no token redaction needed
                raw_data, tokens_used = extract_financial_data_text(raw_text)

        elif ext == ".pdf":
            # ── Standard PDF path (no manual boxes) ─────────────────────────
            raw_text, is_scanned = extract_text_from_pdf(file_path)
            if is_scanned:
                logger.info("Scanned PDF detected — using Claude Vision mode")
                extraction_mode = "vision"
                page_images = pdf_pages_to_base64_images(file_path)
                if not page_images:
                    raise HTTPException(
                        status_code=422,
                        detail="Could not extract text or images from PDF. File may be corrupted.",
                    )
                raw_data, tokens_used = extract_financial_data_vision(page_images)
            else:
                redacted_text = redaction_svc.redact(raw_text)
                raw_data, tokens_used = extract_financial_data_text(redacted_text)

        elif ext in {".xlsx", ".xls"}:
            raw_text = extract_text_from_excel(file_path)
            redacted_text = redaction_svc.redact(raw_text)
            raw_data, tokens_used = extract_financial_data_text(redacted_text)
        else:
            raise HTTPException(status_code=415, detail=f"Unsupported file extension: {ext}")

    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    confidence = float(raw_data.get("confidence_score") or 0.0)
    confidence = max(0.0, min(1.0, confidence))

    # If Reserves & Surplus is already negative, the deficit is embedded in it.
    # Nullify accumulated_losses to prevent double-deduction in all downstream calculations.
    rs_raw_value = (raw_data.get("reserves_surplus") or {}).get("value")
    if rs_raw_value is not None and rs_raw_value < 0:
        raw_data["accumulated_losses"] = None

    # Claude often mistakes the balance sheet grand TOTAL for total_liabilities.
    # On a Schedule III BS: Total Assets = Shareholders' Funds + External Liabilities.
    # If Claude returned total_assets == total_liabilities, recalculate external liabilities
    # as: Total Assets - Net Worth (shareholders' funds subtotal).
    ta_raw = (raw_data.get("total_assets") or {}).get("value")
    tl_raw = (raw_data.get("total_liabilities") or {}).get("value")
    nw_raw = (raw_data.get("net_worth") or {}).get("value")
    if ta_raw is not None and tl_raw is not None and nw_raw is not None:
        if abs(ta_raw - tl_raw) < 1.0:  # Claude gave same number for both sides
            corrected_tl = ta_raw - nw_raw
            raw_data["total_liabilities"] = {
                "value": corrected_tl,
                "source_line": f"Computed: Total Assets ({ta_raw:,.0f}) − Shareholders' Funds ({nw_raw:,.0f})",
            }
            logger.info("Corrected total_liabilities from %s to %s (was equal to total_assets)", tl_raw, corrected_tl)

    prev_raw = raw_data.get("previous_year")
    previous_year = None
    if isinstance(prev_raw, dict) and any(v is not None for k, v in prev_raw.items() if k != "financial_year"):
        previous_year = PreviousYearData(
            financial_year=prev_raw.get("financial_year"),
            share_capital=prev_raw.get("share_capital"),
            reserves_surplus=prev_raw.get("reserves_surplus"),
            accumulated_losses=prev_raw.get("accumulated_losses"),
            net_worth=prev_raw.get("net_worth"),
            total_assets=prev_raw.get("total_assets"),
            total_liabilities=prev_raw.get("total_liabilities"),
            turnover=prev_raw.get("turnover"),
            net_profit=prev_raw.get("net_profit"),
            current_assets=prev_raw.get("current_assets"),
            current_liabilities=prev_raw.get("current_liabilities"),
            working_capital=prev_raw.get("working_capital"),
        )

    extracted = ExtractedData(
        share_capital=_build_financial_figure(raw_data.get("share_capital"), confidence),
        reserves_surplus=_build_financial_figure(raw_data.get("reserves_surplus"), confidence),
        accumulated_losses=_build_financial_figure(raw_data.get("accumulated_losses"), confidence),
        total_assets=_build_financial_figure(raw_data.get("total_assets"), confidence),
        total_liabilities=_build_financial_figure(raw_data.get("total_liabilities"), confidence),
        net_worth=_build_financial_figure(raw_data.get("net_worth"), confidence),
        turnover=_build_financial_figure(raw_data.get("turnover"), confidence),
        net_profit=_build_financial_figure(raw_data.get("net_profit"), confidence),
        current_assets=_build_financial_figure(raw_data.get("current_assets"), confidence),
        current_liabilities=_build_financial_figure(raw_data.get("current_liabilities"), confidence),
        working_capital=_build_financial_figure(raw_data.get("working_capital"), confidence),
        financial_year=raw_data.get("financial_year"),
        company_name=raw_data.get("company_name"),
        currency=raw_data.get("currency") or "INR",
        confidence_score=confidence,
        extraction_notes=raw_data.get("extraction_notes"),
        previous_year=previous_year,
    )

    validation = _validate(raw_data)
    if visual_counts is not None:
        total = sum(visual_counts.values())
        redaction_summary = RedactionSummary(
            cin_count=visual_counts.get("CIN", 0),
            pan_count=visual_counts.get("PAN", 0),
            aadhaar_count=visual_counts.get("AADHAAR", 0),
            mobile_count=visual_counts.get("MOBILE", 0),
            email_count=visual_counts.get("EMAIL", 0),
            gstin_count=visual_counts.get("GSTIN", 0),
            total_redacted=total,
        )
    else:
        redaction_summary = RedactionSummary(**redaction_svc.summary)

    # Store session data for certificate generation
    _session_store[file_id] = {
        "file_path": file_path,
        "extracted_raw": raw_data,
        "extraction_mode": extraction_mode,
        "tokens_used": tokens_used,
    }

    return ExtractionResponse(
        file_id=file_id,
        certificate_type=request.certificate_type,
        extracted_data=extracted,
        validation_results=validation,
        redaction_summary=redaction_summary,
        tokens_used=tokens_used,
        extraction_mode=extraction_mode,
    )


def get_session(file_id: str) -> dict:
    """Retrieve session data for a file_id. Used by certificate router."""
    if file_id not in _session_store:
        raise HTTPException(
            status_code=404,
            detail=f"No extraction session found for file_id: {file_id}. Please run extraction first.",
        )
    return _session_store[file_id]
