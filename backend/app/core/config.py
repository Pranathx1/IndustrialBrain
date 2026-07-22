"""
Centralized application configuration. Every setting the app needs is
declared here once and read from environment variables via `.env`.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "IndustrialBrain AI"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3210",
        "http://localhost:3211",
        "http://127.0.0.1:3000",
    ]

    database_url: str = "postgresql+asyncpg://industrialbrain:industrialbrain@localhost:5432/industrialbrain"

    # Optional — Knowledge Graph falls back to a Postgres-derived graph if Neo4j isn't reachable
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "change-me"

    # Optional — in-memory Qdrant works out of the box for a demo; point at a real instance in production
    qdrant_url: str = ":memory:"

    # Optional — Copilot falls back to extractive (retrieval-only) answers if unset
    gemini_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
