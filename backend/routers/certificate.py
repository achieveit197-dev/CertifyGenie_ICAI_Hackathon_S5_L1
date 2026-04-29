"""
Certificate Router
------------------
POST /api/generate/{file_id}  — Generate PDF + DOCX certificate
GET  /api/download/{certificate_id}/{format}  — Download generated certificate
"""
import logging
import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from config import get_settings
from models.request_models import GenerateRequest
from models.response_models import CertificateResponse
from services.certificate_generator import generate_certificate
from routers.extract import get_session

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

# In-memory certificate registry: cert_id → {pdf_path, docx_path}
_cert_registry: dict[str, dict] = {}


@router.post("/generate/{file_id}", response_model=CertificateResponse)
async def generate_certificate_endpoint(file_id: str, request: GenerateRequest):
    session = get_session(file_id)  # raises 404 if not found
    extracted_raw = session["extracted_raw"]

    # Apply manual overrides from CA if any
    if request.overrides:
        for key, value in request.overrides.items():
            if key in extracted_raw and isinstance(extracted_raw[key], dict):
                extracted_raw[key]["value"] = value
            else:
                extracted_raw[key] = {"value": value, "source_line": "Manual override by CA"}

    ca_dict = request.ca_details.model_dump()

    try:
        result = generate_certificate(
            certificate_type=request.certificate_type,
            extracted=extracted_raw,
            ca_details=ca_dict,
            file_id=file_id,
            custom_narrative=request.custom_narrative,
            additional_notes=request.additional_notes,
            custom_row_labels=request.custom_row_labels,
            custom_cert_number=request.custom_cert_number,
            custom_company_name=request.custom_company_name,
            custom_financial_year=request.custom_financial_year,
            udin=request.udin,
            nw_method_label=request.nw_method_label,
            nw_method_id=request.nw_method or "",
            pdf_password=request.pdf_password or None,
            wc_purpose=request.wc_purpose or "",
        )
    except Exception as exc:
        logger.error("Certificate generation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Certificate generation failed: {exc}")

    cert_id = result["certificate_id"]
    _cert_registry[cert_id] = {
        "pdf_path": result["pdf_path"],
        "docx_path": result["docx_path"],
        "pdf_filename": result["pdf_display_filename"],
        "docx_filename": result["docx_display_filename"],
    }

    base_url = "/api/download"
    return CertificateResponse(
        certificate_id=cert_id,
        certificate_number=result["cert_number"],
        download_url_pdf=f"{base_url}/{cert_id}/pdf",
        download_url_docx=f"{base_url}/{cert_id}/docx",
        generated_at=datetime.now().strftime("%d/%m/%Y %H:%M"),
    )


@router.get("/download/{certificate_id}/{format}")
async def download_certificate(certificate_id: str, format: str):
    if format not in {"pdf", "docx"}:
        raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'docx'")

    if certificate_id not in _cert_registry:
        raise HTTPException(status_code=404, detail="Certificate not found. It may have expired.")

    cert_info = _cert_registry[certificate_id]
    file_path = cert_info[f"{format}_path"]
    filename = cert_info[f"{format}_filename"]

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="Certificate file not found on disk. It may have been cleaned up.",
        )

    media_type = (
        "application/pdf"
        if format == "pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
