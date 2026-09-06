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

    JWT_SECRET: str = "voyara_super_secret_jwt_key_2026_sunset_coast_secure_token"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    GOOGLE_CLIENT_ID: str = "616701780551-tkit9i6ig58m3fc2tt1trd1bgr6a4ak8.apps.googleusercontent.com"

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
