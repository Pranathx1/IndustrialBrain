

import uuid

from app.core.config import settings
from app.rag.embeddings import embed_text
from app.vectordb import qdrant_client

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def chunk_text(text: str) -> list[str]:
    if len(text) <= CHUNK_SIZE:
        return [text] if text.strip() else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start = end - CHUNK_OVERLAP
    return chunks


def index_document(document_id: str, filename: str, text: str) -> int:
    """Chunks, embeds, and upserts a document's text into Qdrant.
    Returns the number of chunks indexed."""
    chunks = chunk_text(text)
    for i, chunk in enumerate(chunks):
        embedding = embed_text(chunk)
        chunk_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{i}"))
        qdrant_client.upsert_chunk(
            chunk_id=chunk_id,
            embedding=embedding,
            payload={"document_id": document_id, "filename": filename, "chunk_index": i, "text": chunk},
        )
    return len(chunks)


def retrieve(query: str, top_k: int = 5) -> list[dict]:
    query_embedding = embed_text(query)
    return qdrant_client.search(query_embedding, top_k=top_k)


def generate_answer(query: str, retrieved_chunks: list[dict]) -> dict:
    if not retrieved_chunks:
        return {
            "answer": "I couldn't find any indexed document content relevant to that question. "
            "Try uploading a related document first, or rephrase your question.",
            "confidence": 0.0,
            "sources": [],
            "reasoning_available": False,
        }

    if settings.gemini_api_key:
        try:
            return _generate_with_gemini(query, retrieved_chunks)
        except Exception as exc:  # noqa: BLE001 - any Gemini failure falls back, never breaks the Copilot
            print(f"[rag.pipeline] Gemini generation failed ({exc}); falling back to extractive answer.")
    return _generate_extractive(query, retrieved_chunks)


def _generate_with_gemini(query: str, chunks: list[dict]) -> dict:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    # "-latest" alias auto-points at the current stable flash model, so this
    # doesn't need updating every time Google retires a dated model version
    # (gemini-1.5-flash and the entire 1.x/2.0 line have since been shut down).
    model = genai.GenerativeModel("gemini-flash-latest")

    context = "\n\n".join(f"[Source: {c['filename']}]\n{c['text']}" for c in chunks)
    prompt = (
        "You are an industrial knowledge assistant. Answer only using the provided context. "
        "If the context does not contain sufficient information, say so explicitly rather than inferring.\n\n"
        f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
    )
    response = model.generate_content(prompt)

    return {
        "answer": response.text,
        "confidence": round(sum(c["score"] for c in chunks) / len(chunks), 2),
        "sources": [{"filename": c["filename"], "document_id": c["document_id"], "snippet": c["text"][:200]} for c in chunks],
        "reasoning_available": True,
    }


def _generate_extractive(query: str, chunks: list[dict]) -> dict:
    
    top = chunks[0]
    answer = (
        f"AI-generated synthesis is unavailable (no GEMINI_API_KEY configured). "
        f"Here is the most relevant passage found for \"{query}\":\n\n"
        f"\u201c{top['text'].strip()}\u201d\n\n(from {top['filename']})"
    )
    return {
        "answer": answer,
        "confidence": round(top["score"], 2),
        "sources": [{"filename": c["filename"], "document_id": c["document_id"], "snippet": c["text"][:200]} for c in chunks],
        "reasoning_available": False,
    }