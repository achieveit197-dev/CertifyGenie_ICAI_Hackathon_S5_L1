import logging
import os
from contextlib import asynccontextmanager

from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routers import upload, extract, certificate, redact_check, networth_methods
from routers import email_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()
scheduler = AsyncIOScheduler()


def cleanup_old_files() -> None:
    """Delete uploaded files older than FILE_EXPIRY_HOURS and certs older than CERT_EXPIRY_HOURS."""
    now = datetime.utcnow()

    upload_dir = settings.upload_dir
    if os.path.isdir(upload_dir):
        cutoff = now - timedelta(hours=settings.file_expiry_hours)
        for fname in os.listdir(upload_dir):
            fpath = os.path.join(upload_dir, fname)
            try:
                mtime = datetime.utcfromtimestamp(os.path.getmtime(fpath))
                if mtime < cutoff:
                    os.remove(fpath)
                    logger.info("Deleted expired upload: %s", fname)
            except Exception as exc:
                logger.warning("Could not delete %s: %s", fpath, exc)

    output_dir = settings.output_dir
    if os.path.isdir(output_dir):
        cutoff = now - timedelta(hours=settings.cert_expiry_hours)
        for fname in os.listdir(output_dir):
            fpath = os.path.join(output_dir, fname)
            try:
                mtime = datetime.utcfromtimestamp(os.path.getmtime(fpath))
                if mtime < cutoff:
                    os.remove(fpath)
                    logger.info("Deleted expired certificate: %s", fname)
            except Exception as exc:
                logger.warning("Could not delete %s: %s", fpath, exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage directories exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.output_dir, exist_ok=True)

    # Start background cleanup job (runs every 30 minutes)
    scheduler.add_job(cleanup_old_files, "interval", minutes=30)
    scheduler.start()
    logger.info("Certify Genie backend started. Cleanup scheduler active.")
    yield
    scheduler.shutdown()
    logger.info("Certify Genie backend shutting down.")


app = FastAPI(
    title="Certify Genie API",
    description="AI-Powered Certificate Generation for CA Firms",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(extract.router, prefix="/api", tags=["Extract"])
app.include_router(networth_methods.router, prefix="/api", tags=["NetWorth"])
app.include_router(certificate.router, prefix="/api", tags=["Certificate"])
app.include_router(redact_check.router, prefix="/api", tags=["Redact"])
app.include_router(email_router.router, prefix="/api", tags=["Email"])


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "model": settings.claude_model,
        "environment": settings.app_env,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
