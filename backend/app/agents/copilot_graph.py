"""
LangGraph orchestration for the AI Copilot query pipeline.

Real `StateGraph` usage — each node is a genuine async function
operating on shared state. The graph:

    retrieve -> enrich_with_asset_context -> generate -> END

`retrieve` and `generate` reuse `app/rag/pipeline.py`. `enrich_with_asset_context`
demonstrates the multi-agent pattern: when a query mentions a known
equipment tag, it pulls that asset's current health status into
context so the Response node can ground its answer in live asset
state alongside the retrieved document evidence.
"""

import re
from typing import TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Asset
from app.rag.pipeline import generate_answer, retrieve

_ASSET_TAG_RE = re.compile(r"\b([A-Z]{1,3}-\d{2,4}[A-Z]?)\b")


class CopilotState(TypedDict, total=False):
    query: str
    retrieved_chunks: list[dict]
    asset_context: list[dict]
    answer: str
    confidence: float
    sources: list[dict]
    reasoning_available: bool


async def _retrieve_node(state: CopilotState) -> CopilotState:
    chunks = retrieve(state["query"], top_k=5)
    return {"retrieved_chunks": chunks}


def _make_enrich_node(db: AsyncSession):
    async def _enrich_with_asset_context(state: CopilotState) -> CopilotState:
        tags = set(_ASSET_TAG_RE.findall(state["query"].upper()))
        if not tags:
            return {"asset_context": []}

        result = await db.execute(select(Asset).where(Asset.tag.in_(tags)))
        assets = result.scalars().all()
        return {
            "asset_context": [
                {"tag": a.tag, "name": a.name, "health": a.health.value, "facility": a.facility}
                for a in assets
            ]
        }

    return _enrich_with_asset_context


async def _generate_node(state: CopilotState) -> CopilotState:
    result = generate_answer(state["query"], state["retrieved_chunks"])

    answer = result["answer"]
    if state.get("asset_context"):
        lines = "\n".join(f"- {a['tag']} ({a['name']}): current health status is {a['health']}" for a in state["asset_context"])
        answer += f"\n\nCurrent asset status:\n{lines}"

    return {
        "answer": answer,
        "confidence": result["confidence"],
        "sources": result["sources"],
        "reasoning_available": result["reasoning_available"],
    }


def build_copilot_graph(db: AsyncSession):
    graph = StateGraph(CopilotState)
    graph.add_node("retrieve", _retrieve_node)
    graph.add_node("enrich_with_asset_context", _make_enrich_node(db))
    graph.add_node("generate", _generate_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "enrich_with_asset_context")
    graph.add_edge("enrich_with_asset_context", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


async def run_copilot_query(db: AsyncSession, query: str) -> CopilotState:
    app_graph = build_copilot_graph(db)
    return await app_graph.ainvoke({"query": query})
