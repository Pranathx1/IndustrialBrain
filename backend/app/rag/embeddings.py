

import hashlib

from app.core.config import settings

EMBEDDING_DIM = 256


def embed_text(text: str) -> list[float]:
    if settings.gemini_api_key:
        try:
            return _embed_with_gemini(text)
        except Exception as exc:  # noqa: BLE001 - any Gemini failure falls back, never blocks indexing
            print(f"[embeddings] Gemini embedding failed ({exc}); falling back to hashing embedding.")
    return _embed_with_hashing(text)


def _embed_with_gemini(text: str) -> list[float]:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(model="models/gemini-embedding-001", content=text, output_dimensionality=EMBEDDING_DIM)
    return list(result["embedding"])


def _embed_with_hashing(text: str, n: int = 3) -> list[float]:
    
    vector = [0.0] * EMBEDDING_DIM
    normalized = text.lower()
    grams = [normalized[i : i + n] for i in range(max(1, len(normalized) - n + 1))]

    for gram in grams:
        digest = hashlib.sha256(gram.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    magnitude = sum(v * v for v in vector) ** 0.5
    if magnitude == 0:
        return vector
    return [v / magnitude for v in vector]