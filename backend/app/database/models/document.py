"""
Document + extracted-entity ORM models.

A Document moves through a fixed pipeline of stages (see ProcessingStage
below); each stage transition is recorded in `stage_history` so the
frontend's processing timeline reflects real backend state rather than
a client-side fake timer.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database.session import Base


class DocumentType(str, enum.Enum):
    PDF = "pdf"
    DOCX = "docx"
    IMAGE = "image"


class ProcessingStatus(str, enum.Enum):
    QUEUED = "queued"
    OCR = "ocr"
    ENTITY_EXTRACTION = "entity_extraction"
    EMBEDDING = "embedding"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    COMPLETE = "complete"
    FAILED = "failed"


# JSON on SQLite (used in local/dev testing), JSONB on Postgres (production).
# SQLAlchemy's generic JSON type maps correctly to both automatically.
JsonType = JSON().with_variant(JSONB, "postgresql")


def _uuid() -> str:
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(512))
    doc_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType))
    storage_path: Mapped[str] = mapped_column(String(1024))
    status: Mapped[ProcessingStatus] = mapped_column(Enum(ProcessingStatus), default=ProcessingStatus.QUEUED)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    extracted_text_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(nullable=True)

    stage_history: Mapped[list] = mapped_column(JsonType, default=list)
    """List of {stage, status, started_at, completed_at} — the audit trail
    the frontend's timeline renders directly."""

    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by: Mapped[str] = mapped_column(String(128), default="engineer@vizagplant.com")

    entities: Mapped[list["ExtractedEntity"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class EntityType(str, enum.Enum):
    EQUIPMENT_TAG = "equipment_tag"
    STANDARD_REFERENCE = "standard_reference"
    DATE = "date"
    PRESSURE_VALUE = "pressure_value"
    TEMPERATURE_VALUE = "temperature_value"
    PERSONNEL_ROLE = "personnel_role"


class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"))
    entity_type: Mapped[EntityType] = mapped_column(Enum(EntityType))
    value: Mapped[str] = mapped_column(String(256))
    confidence: Mapped[float] = mapped_column()
    context_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    document: Mapped[Document] = relationship(back_populates="entities")
