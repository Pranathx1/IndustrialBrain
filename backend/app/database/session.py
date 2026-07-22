"""
Async SQLAlchemy engine + session factory.

Every module that touches PostgreSQL (users, documents, assets, audit
logs — modeled in a later phase) imports `get_db` as a FastAPI
dependency rather than constructing its own engine.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=settings.environment == "development", pool_pre_ping=True)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """Shared declarative base — every ORM model in `app/database/models/` inherits this."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields a session, guarantees it's closed after the request."""
    async with AsyncSessionLocal() as session:
        yield session
