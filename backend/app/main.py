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
            conn.execute(text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS cancellation_refund_percentage INTEGER DEFAULT 50;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_information_message_snapshot TEXT;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_reminder_sent BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS booking_id INTEGER;"))

            # Financial snapshot and settlement status columns for Bookings
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_total_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_percentage_snapshot FLOAT DEFAULT 10.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_refund_percentage_snapshot FLOAT DEFAULT 50.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS retained_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_settlement_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_status VARCHAR(50) DEFAULT 'NOT_FINALIZED';"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'NOT_APPLICABLE';"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'NOT_READY';"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_processed_at TIMESTAMP NULL;"))

            # Backfill original_total_amount for existing bookings if 0
            conn.execute(text("UPDATE bookings SET original_total_amount = total_amount WHERE original_total_amount = 0.0 AND total_amount > 0;"))
            conn.execute(text("UPDATE bookings SET commission_percentage_snapshot = 10.0 WHERE commission_percentage_snapshot IS NULL OR commission_percentage_snapshot = 0.0;"))
            conn.execute(text("UPDATE bookings SET cancellation_refund_percentage_snapshot = 50.0 WHERE cancellation_refund_percentage_snapshot IS NULL;"))

            # Financial columns for Refunds
            conn.execute(text("ALTER TABLE refunds ADD COLUMN IF NOT EXISTS retained_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE refunds ADD COLUMN IF NOT EXISTS commission_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE refunds ADD COLUMN IF NOT EXISTS provider_settlement_amount FLOAT DEFAULT 0.0;"))

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
            # Child Occupancy & Additional Child Policy columns for property_rules
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS additional_children_allowed INTEGER DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS max_child_age INTEGER NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS free_additional_children INTEGER DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS child_charge_enabled BOOLEAN DEFAULT FALSE NOT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS child_charge_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS child_charge_unit VARCHAR(50) DEFAULT 'Per night';"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS existing_bed_allowed VARCHAR(20) DEFAULT 'Yes' NOT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS existing_bed_explanation TEXT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS extra_bed_available VARCHAR(20) DEFAULT 'No' NOT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS extra_bed_charge_unit VARCHAR(50) DEFAULT 'Per night';"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS cot_available VARCHAR(20) DEFAULT 'No' NOT NULL;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS cot_price FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE property_rules ADD COLUMN IF NOT EXISTS cot_charge_unit VARCHAR(50) DEFAULT 'Free';"))

            # Child Occupancy & Additional Child Policy columns for room_rules
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS additional_children_allowed INTEGER DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS max_child_age INTEGER NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS free_additional_children INTEGER DEFAULT 0 NOT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS child_charge_enabled BOOLEAN DEFAULT FALSE NOT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS child_charge_amount FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS child_charge_unit VARCHAR(50) DEFAULT 'Per night';"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS existing_bed_allowed VARCHAR(20) DEFAULT 'Yes' NOT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS existing_bed_explanation TEXT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS extra_bed_available VARCHAR(20) DEFAULT 'No' NOT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS extra_bed_charge_unit VARCHAR(50) DEFAULT 'Per night';"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS cot_available VARCHAR(20) DEFAULT 'No' NOT NULL;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS cot_price FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE room_rules ADD COLUMN IF NOT EXISTS cot_charge_unit VARCHAR(50) DEFAULT 'Free';"))
            conn.execute(text("ALTER TABLE properties ADD COLUMN IF NOT EXISTS legal_document_status VARCHAR(50) DEFAULT 'PENDING';"))

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

# Background task for daily legal document expiry checks
async def periodic_legal_document_expiry_task():
    while True:
        try:
            from app.services.properties.legal_document_expiry_cron import LegalDocumentExpiryCron
            db = SessionLocal()
            LegalDocumentExpiryCron.run_daily_expiry_checks(db)
            db.close()
        except Exception as e:
            print("Background legal document expiry check exception:", e)
        await asyncio.sleep(3600)  # Check every hour

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
    expiry_task = asyncio.create_task(periodic_legal_document_expiry_task())
    yield
    reminder_task.cancel()
    expiry_task.cancel()

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
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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

