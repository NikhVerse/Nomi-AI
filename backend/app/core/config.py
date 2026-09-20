from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_ENV: str = "development"
    PROJECT_NAME: str = "Nomi AI"
    SECRET_KEY: str = "nomi_ai_super_secret_jwt_key_change_in_production_3892748921"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/nomi.db"
    GEMINI_API_KEY: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
