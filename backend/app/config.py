import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Voyara"
    PROJECT_SLOGAN: str = "Find Your Place."
    PROJECT_BRAND: str = "Stay. Explore. Adventure."
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/voyara"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

    JWT_SECRET: str = "voyara_default_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://voyara-delta.vercel.app",
        "https://voyara.vercel.app"
    ]
    GOOGLE_CLIENT_ID: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_NAME: str = "Voyara"
    EMAILS_FROM_EMAIL: str = "no-reply@voyara.com"
    FRONTEND_URL: str = "http://localhost:5173"

    # OTP & SMS Provider Configuration ("development" or "2factor")
    OTP_PROVIDER: str = "development"

    # SMS Gateway Configuration (2Factor / Fast2SMS / Twilio / MSG91 / Textlocal)
    TWOFACTOR_API_KEY: str = ""
    FAST2SMS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    MSG91_AUTH_KEY: str = ""
    TEXTLOCAL_API_KEY: str = ""

    # Gemini AI Trip Planner Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if not v:
            return "postgresql+psycopg://postgres:postgres@localhost:5432/voyara"
        val = str(v).strip()
        # Automatically normalize Render PostgreSQL URLs for SQLAlchemy + Psycopg 3
        if val.startswith("postgres://"):
            val = "postgresql+psycopg://" + val[len("postgres://"):]
        elif val.startswith("postgresql://") and not val.startswith("postgresql+"):
            val = "postgresql+psycopg://" + val[len("postgresql://"):]
        return val

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        default_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "https://voyara-delta.vercel.app",
            "https://voyara.vercel.app"
        ]
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
            for d in default_origins:
                if d not in origins:
                    origins.append(d)
            return origins
        elif isinstance(v, str):
            import json
            try:
                origins = json.loads(v)
                if isinstance(origins, list):
                    for d in default_origins:
                        if d not in origins:
                            origins.append(d)
                    return origins
                return [v]
            except Exception:
                return [v]
        elif isinstance(v, list):
            origins = list(v)
            for d in default_origins:
                if d not in origins:
                    origins.append(d)
            return origins
        return default_origins

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

settings = Settings()
