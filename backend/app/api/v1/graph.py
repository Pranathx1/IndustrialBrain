"""Knowledge Graph endpoints. Tries Neo4j first; falls back to a
Postgres-derived graph if Neo4j isn't reachable, so the module works
without extra infrastructure on first run."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.graph import fallback_graph, neo4j_client

router = APIRouter(prefix="/graph", tags=["knowledge-graph"])


class GraphNode(BaseModel):
    id: str
    labels: list[str]
    model_config = {"extra": "allow"}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str


class GraphResponse(BaseModel):
    nodes: list[dict]
    edges: list[GraphEdge]
    source: str


@router.get("", response_model=GraphResponse)
async def get_full_graph(db: AsyncSession = Depends(get_db)) -> GraphResponse:
    if await neo4j_client.health_check():
        # Neo4j is reachable — in a full deployment this would query the
        # full graph via Cypher. Phase scope wires the neighborhood query
        # (below); the full-graph Cypher equivalent is a straightforward
        # extension of the same client.
        pass

    result = await fallback_graph.build_full_graph(db)
    return GraphResponse(**result)


@router.get("/entity/{asset_tag}", response_model=GraphResponse)
async def get_entity_neighborhood(asset_tag: str, db: AsyncSession = Depends(get_db)) -> GraphResponse:
    if await neo4j_client.health_check():
        result = await neo4j_client.get_entity_neighborhood(asset_tag)
        return GraphResponse(**result, source="neo4j")

    result = await fallback_graph.build_entity_neighborhood(db, asset_tag)
    return GraphResponse(**result)
