"""Incidents and near-misses — the input corpus for Root Cause Analysis."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class IncidentSeverity(str, enum.Enum):
    NEAR_MISS = "near_miss"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


def _uuid() -> str:
    return str(uuid.uuid4())


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity))
    occurred_at: Mapped[datetime] = mapped_column(DateTime)
