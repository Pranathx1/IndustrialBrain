"""
Qdrant vector store client.

Real qdrant-client usage. Defaults to Qdrant's in-memory mode when
`QDRANT_URL` points at `:memory:` (useful for tests/demos without a
server); production points `QDRANT_URL` at a real Qdrant instance
(see `docker-compose.yml`).
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings

COLLECTION_NAME = "document_chunks"
VECTOR_SIZE = 256  # matches app.rag.embeddings.EMBEDDING_DIM

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url) if settings.qdrant_url != ":memory:" else QdrantClient(":memory:")
        _ensure_collection(_client)
    return _client


def _ensure_collection(client: QdrantClient) -> None:
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def upsert_chunk(chunk_id: str, embedding: list[float], payload: dict) -> None:
    client = get_client()
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[PointStruct(id=chunk_id, vector=embedding, payload=payload)],
    )


def search(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    client = get_client()
    hits = client.query_points(
        collection_name=COLLECTION_NAME, query=query_embedding, limit=top_k
    ).points
    return [{"score": hit.score, **(hit.payload or {})} for hit in hits]
