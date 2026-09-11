import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import api_router
from app.services.reminders.reminder_service import ReminderService

# Ensure all database tables are created
Base.metadata.create_all(bind=engine)

# Auto-migrate required columns if not present
def ensure_db_schema():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS guest_information_message TEXT;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_information_message_snapshot TEXT;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_reminder_sent BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS booking_id INTEGER;"))

            # User verification and account safety columns
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE NOT NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_hash VARCHAR(255) NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_attempts INTEGER DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_last_sent_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255) NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by INTEGER NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(1000) NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_by INTEGER NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(1000) NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1 NOT NULL;"))
            conn.commit()
    except Exception as e:
        print("Schema verification warning:", e)

ensure_db_schema()

# Background task for check-in reminders (runs every 15 minutes)
async def periodic_checkin_reminders_task():
    while True:
        try:
            db = SessionLocal()
            ReminderService.process_checkin_reminders(db)
            db.close()
        except Exception as e:
            print("Background reminder check exception:", e)
        await asyncio.sleep(900)  # Check every 15 minutes

# Production Security Validation
def validate_security_configuration():
    """Ensure production safety: refuse to start in production if development OTP is enabled."""
    env = getattr(settings, "ENVIRONMENT", "development").strip().lower()
    otp_prov = getattr(settings, "OTP_PROVIDER", "development").strip().lower()
    if env == "production" and otp_prov == "development":
        raise RuntimeError(
            "CRITICAL SECURITY ERROR: Cannot run in PRODUCTION mode with OTP_PROVIDER='development'. "
            "You must set OTP_PROVIDER='2factor' in production."
        )

validate_security_configuration()

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_security_configuration()
    ensure_db_schema()
    reminder_task = asyncio.create_task(periodic_checkin_reminders_task())
    yield
    reminder_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Voyara - Smart Accommodation & Experience Marketplace with VeriNova Transaction Verification Layer.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(api_router)

@app.get("/")
def root_info():
    return {
        "name": settings.PROJECT_NAME,
        "slogan": settings.PROJECT_SLOGAN,
        "brand_message": settings.PROJECT_BRAND,
        "status": "online",
        "verinova_layer": "active",
        "api_documentation": "/docs"
    }

