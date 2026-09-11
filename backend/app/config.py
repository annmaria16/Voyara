import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Voyara"
    PROJECT_SLOGAN: str = "Find Your Place."
    PROJECT_BRAND: str = "Stay. Explore. Experience."
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "postgresql+psycopg://postgres:Annmaria%4016@localhost:5432/voyara"
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

    JWT_SECRET: str = "voyara_super_secret_jwt_key_2026_sunset_coast_secure_token"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    GOOGLE_CLIENT_ID: str = "616701780551-tkit9i6ig58m3fc2tt1trd1bgr6a4ak8.apps.googleusercontent.com"
    RAZORPAY_KEY_ID: str = "rzp_test_4GCxMOoqwqydp6"
    RAZORPAY_KEY_SECRET: str = "1mlfmOmQcstOlmTtCztPYXFB"

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

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
