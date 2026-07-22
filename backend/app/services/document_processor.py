

import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Document, EntityType, ExtractedEntity, ProcessingStatus
from app.database.session import AsyncSessionLocal
from app.ocr.extractor import extract_text
from app.services.entity_extraction import extract_entities


def _stage_entry(stage: str, status: str) -> dict:
    return {"stage": stage, "status": status, "timestamp": datetime.utcnow().isoformat()}


async def _advance(db: AsyncSession, document: Document, status: ProcessingStatus, stage_label: str) -> None:
    document.status = status
    document.stage_history = [*document.stage_history, _stage_entry(stage_label, "started")]
    await db.commit()


async def _complete_stage(db: AsyncSession, document: Document, stage_label: str) -> None:
    document.stage_history = [*document.stage_history, _stage_entry(stage_label, "completed")]
    await db.commit()


async def process_document(document_id: str) -> None:
    """Entry point invoked as a FastAPI BackgroundTask. Opens its own DB
    session since the request-scoped session is already closed by the
    time this runs."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        document = result.scalar_one_or_none()
        if document is None:
            return

        try:
            await _run_pipeline(db, document)
        except Exception as exc:  # noqa: BLE001 - surfaced to the user via document.error_message
            document.status = ProcessingStatus.FAILED
            document.error_message = str(exc)
            document.stage_history = [*document.stage_history, _stage_entry("failed", str(exc))]
            await db.commit()


async def _try_write_to_neo4j(document: Document, candidates) -> None:
    """Best-effort: writes equipment-tag entities into Neo4j if it's
    reachable. Swallows connection errors — the Postgres-derived
    fallback graph makes this optional, not load-bearing."""
    from app.graph import neo4j_client

    try:
        if not await neo4j_client.health_check():
            return
        for candidate in candidates:
            if candidate.entity_type.value == "equipment_tag":
                await neo4j_client.link_document_entity(document.id, candidate.value)
    except Exception:  # noqa: BLE001 - Neo4j unavailability is expected, not an error
        pass


async def _run_pipeline(db: AsyncSession, document: Document) -> None:
    # --- OCR ---
    await _advance(db, document, ProcessingStatus.OCR, "ocr")
    ocr_result = await asyncio.to_thread(extract_text, document.storage_path)
    document.extracted_text_preview = ocr_result.text[:2000]
    document.ocr_confidence = round(ocr_result.confidence, 2)
    await _complete_stage(db, document, "ocr")

    # --- Entity extraction ---
    await _advance(db, document, ProcessingStatus.ENTITY_EXTRACTION, "entity_extraction")
    candidates = extract_entities(ocr_result.text)
    for candidate in candidates:
        db.add(
            ExtractedEntity(
                document_id=document.id,
                entity_type=EntityType(candidate.entity_type),
                value=candidate.value,
                confidence=candidate.confidence,
                context_snippet=candidate.context_snippet,
            )
        )
    await db.commit()
    await _complete_stage(db, document, "entity_extraction")

    # --- Embedding (real: chunks the extracted text and indexes it in Qdrant) ---
    await _advance(db, document, ProcessingStatus.EMBEDDING, "embedding")
    from app.rag.pipeline import index_document

    chunk_count = await asyncio.to_thread(index_document, document.id, document.filename, ocr_result.text)
    await _complete_stage(db, document, "embedding")

    # --- Knowledge graph write (attempts real Neo4j writes; the graph
    # module also derives an equivalent graph from Postgres directly,
    # so a missing/unreachable Neo4j instance doesn't block the pipeline
    # or leave the Knowledge Graph module empty — see app/graph/fallback_graph.py) ---
    await _advance(db, document, ProcessingStatus.KNOWLEDGE_GRAPH, "knowledge_graph")
    await _try_write_to_neo4j(document, candidates)
    await _complete_stage(db, document, "knowledge_graph")

    # --- Complete ---
    document.status = ProcessingStatus.COMPLETE
    document.stage_history = [*document.stage_history, _stage_entry("complete", "completed")]
    await db.commit()
