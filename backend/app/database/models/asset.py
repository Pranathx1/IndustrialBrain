"""Asset registry — physical equipment tracked across the industrial estate."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class AssetHealth(str, enum.Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"


def _uuid() -> str:
    return str(uuid.uuid4())


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tag: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # e.g. "P-101"
    name: Mapped[str] = mapped_column(String(255))
    asset_type: Mapped[str] = mapped_column(String(64))  # pump, compressor, valve, ...
    facility: Mapped[str] = mapped_column(String(128))
    health: Mapped[AssetHealth] = mapped_column(Enum(AssetHealth), default=AssetHealth.HEALTHY)
    install_date: Mapped[datetime] = mapped_column(DateTime)
    last_inspection_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
