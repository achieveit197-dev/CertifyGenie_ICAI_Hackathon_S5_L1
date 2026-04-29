import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str = "your_anthropic_api_key_here"
    claude_model: str = "claude-sonnet-4-6"
    max_file_size_mb: int = 10
    upload_dir: str = "./uploads"
    output_dir: str = "./outputs"
    cors_origins: str = "http://localhost:5173"
    app_env: str = "development"
    file_expiry_hours: int = 1
    cert_expiry_hours: int = 24
    email_host: str = "smtp.gmail.com"
    email_port: int = 587
    email_user: str = "your_email@gmail.com"
    email_password: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()
