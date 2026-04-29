"""
Email Router
------------
POST /api/send-email/{cert_id}  — Send generated certificate to client via email.
"""
import logging
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException

from services.email_service import send_certificate_email
from routers.certificate import _cert_registry   # shared in-memory cert store

logger = logging.getLogger(__name__)
router = APIRouter()


class SendEmailRequest(BaseModel):
    recipient_email: str = Field(..., description="Client email address")
    subject: str         = Field(..., description="Email subject line")
    body: str            = Field(..., description="Email body text")


@router.post("/send-email/{cert_id}")
async def send_email(cert_id: str, request: SendEmailRequest):
    if cert_id not in _cert_registry:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found. It may have expired or been cleaned up.",
        )

    cert_info = _cert_registry[cert_id]
    pdf_path     = cert_info["pdf_path"]
    pdf_filename = cert_info["pdf_filename"]

    try:
        send_certificate_email(
            pdf_path=pdf_path,
            pdf_filename=pdf_filename,
            recipient_email=request.recipient_email,
            subject=request.subject,
            body=request.body,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Failed to send email: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Email send failed: {e}")

    return {"message": f"Certificate emailed to {request.recipient_email} successfully."}
