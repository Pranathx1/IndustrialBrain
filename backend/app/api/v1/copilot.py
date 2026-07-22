"""AI Copilot endpoint — conversational RAG over indexed documents, orchestrated via LangGraph."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.copilot_graph import run_copilot_query
from app.database.session import get_db

router = APIRouter(prefix="/copilot", tags=["copilot"])


class CopilotQuery(BaseModel):
    query: str


class SourceOut(BaseModel):
    filename: str
    document_id: str
    snippet: str


class CopilotResponse(BaseModel):
    answer: str
    confidence: float
    sources: list[SourceOut]
    reasoning_available: bool
    suggested_followups: list[str]


SUGGESTED_QUESTIONS = [
    "Has pump P-101 had prior vibration-related failures?",
    "What's the current health status of boiler B-204?",
    "Summarize the most recent inspection report for compressor equipment.",
    "What maintenance is recommended for high-risk assets right now?",
]


@router.get("/suggestions", response_model=list[str])
async def get_suggested_questions() -> list[str]:
    return SUGGESTED_QUESTIONS


@router.post("/query", response_model=CopilotResponse)
async def query_copilot(payload: CopilotQuery, db: AsyncSession = Depends(get_db)) -> CopilotResponse:
    state = await run_copilot_query(db, payload.query)

    followups = [q for q in SUGGESTED_QUESTIONS if q.lower() != payload.query.lower()][:2]

    return CopilotResponse(
        answer=state["answer"],
        confidence=state["confidence"],
        sources=[SourceOut(**s) for s in state["sources"]],
        reasoning_available=state["reasoning_available"],
        suggested_followups=followups,
    )
