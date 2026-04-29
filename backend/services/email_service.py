"""
Email Service
-------------
Sends certificate emails via SMTP with PDF attached.
Supports Gmail (smtp.gmail.com:587) and any other SMTP provider via .env config.

Required .env vars:
  EMAIL_USER      — sender address (e.g. yourfirm@gmail.com)
  EMAIL_PASSWORD  — SMTP password / Gmail App Password
  EMAIL_HOST      — defaults to smtp.gmail.com
  EMAIL_PORT      — defaults to 587
"""
import logging
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def send_certificate_email(
    pdf_path: str,
    pdf_filename: str,
    recipient_email: str,
    subject: str,
    body: str,
) -> None:
    """
    Send an email with the certificate PDF attached.
    Raises ValueError if email credentials are not configured.
    Raises smtplib.SMTPException on send failure.
    """
    email_user = getattr(settings, "email_user", "")
    email_password = getattr(settings, "email_password", "")
    email_host = getattr(settings, "email_host", "smtp.gmail.com")
    email_port = getattr(settings, "email_port", 587)

    if not email_user or not email_password or email_user == "your_email@gmail.com":
        raise ValueError(
            "Email credentials not configured. "
            "Add EMAIL_USER and EMAIL_PASSWORD to backend/.env to enable email sending."
        )

    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"Certificate PDF not found: {pdf_path}")

    msg = MIMEMultipart()
    msg["From"]    = email_user
    msg["To"]      = recipient_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Attach PDF
    with open(pdf_path, "rb") as f:
        part = MIMEBase("application", "pdf")
        part.set_payload(f.read())
    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition",
        "attachment",
        filename=pdf_filename,
    )
    msg.attach(part)

    logger.info("Sending certificate email to %s via %s:%s", recipient_email, email_host, email_port)

    with smtplib.SMTP(email_host, int(email_port)) as server:
        server.ehlo()
        server.starttls()
        server.login(email_user, email_password)
        server.sendmail(email_user, recipient_email, msg.as_string())

    logger.info("Certificate email sent successfully to %s", recipient_email)
