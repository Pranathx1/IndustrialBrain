"""
Document Intelligence API — upload, list, and per-document detail
(including stage history and extracted entities).
"""

import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Document, DocumentType, ProcessingStatus
from app.database.session import get_db
from app.services.document_processor import process_document

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_EXTENSION_TYPE_MAP: dict[str, DocumentType] = {
    ".pdf": DocumentType.PDF,
    ".docx": DocumentType.DOCX,
    ".png": DocumentType.IMAGE,
    ".jpg": DocumentType.IMAGE,
    ".jpeg": DocumentType.IMAGE,
    ".tiff": DocumentType.IMAGE,
    ".tif": DocumentType.IMAGE,
}

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


class EntityOut(BaseModel):
    entity_type: str
    value: str
    confidence: float
    context_snippet: str | None


class StageEvent(BaseModel):
    stage: str
    status: str
    timestamp: str


class DocumentOut(BaseModel):
    id: str
    filename: str
    doc_type: str
    status: str
    error_message: str | None
    ocr_confidence: float | None
    uploaded_at: str
    uploaded_by: str

    @classmethod
    def from_model(cls, doc: Document) -> "DocumentOut":
        return cls(
            id=doc.id,
            filename=doc.filename,
            doc_type=doc.doc_type.value,
            status=doc.status.value,
            error_message=doc.error_message,
            ocr_confidence=doc.ocr_confidence,
            uploaded_at=doc.uploaded_at.isoformat(),
            uploaded_by=doc.uploaded_by,
        )


class DocumentDetailOut(DocumentOut):
    extracted_text_preview: str | None
    stage_history: list[StageEvent]
    entities: list[EntityOut]


class UploadResponse(BaseModel):
    document: DocumentOut
    message: Literal["accepted"] = "accepted"


@router.post("/upload", response_model=UploadResponse, status_code=202)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    suffix = Path(file.filename or "").suffix.lower()
    doc_type = _EXTENSION_TYPE_MAP.get(suffix)
    if doc_type is None:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Accepted: {', '.join(sorted(_EXTENSION_TYPE_MAP))}",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 25 MB upload limit.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    document_id = str(uuid.uuid4())
    storage_path = UPLOAD_DIR / f"{document_id}{suffix}"
    storage_path.write_bytes(contents)

    document = Document(
        id=document_id,
        filename=file.filename or "untitled",
        doc_type=doc_type,
        storage_path=str(storage_path),
        status=ProcessingStatus.QUEUED,
        stage_history=[{"stage": "queued", "status": "completed", "timestamp": _now_iso()}],
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    background_tasks.add_task(process_document, document.id)

    return UploadResponse(document=DocumentOut.from_model(document))


@router.get("", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)) -> list[DocumentOut]:
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    return [DocumentOut.from_model(doc) for doc in result.scalars().all()]


@router.get("/{document_id}", response_model=DocumentDetailOut)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)) -> DocumentDetailOut:
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    await db.refresh(document, attribute_names=["entities"])

    return DocumentDetailOut(
        **DocumentOut.from_model(document).model_dump(),
        extracted_text_preview=document.extracted_text_preview,
        stage_history=[StageEvent(**event) for event in document.stage_history],
        entities=[
            EntityOut(
                entity_type=e.entity_type.value,
                value=e.value,
                confidence=e.confidence,
                context_snippet=e.context_snippet,
            )
            for e in document.entities
        ],
    )


def _now_iso() -> str:
    from datetime import datetime

    return datetime.utcnow().isoformat()
