"""Maintenance timeline entries — completed work orders, scheduled maintenance, and predictive triggers."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class MaintenanceEventType(str, enum.Enum):
    COMPLETED = "completed"
    UPCOMING = "upcoming"
    PREDICTED = "predicted"


def _uuid() -> str:
    return str(uuid.uuid4())


class MaintenanceEvent(Base):
    __tablename__ = "maintenance_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"))
    event_type: Mapped[MaintenanceEventType] = mapped_column(Enum(MaintenanceEventType))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    scheduled_date: Mapped[datetime] = mapped_column(DateTime)
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0-100, for predicted events
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
