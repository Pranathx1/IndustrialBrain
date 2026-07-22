"""
Fallback knowledge graph, derived from Postgres.

Neo4j is the intended production graph store, but requiring it to be
running before the Knowledge Graph module works at all is a bad
first-run experience. This module builds an equivalent graph directly
from Asset / Document / ExtractedEntity rows already in Postgres —
same {nodes, edges} contract as `neo4j_client.get_entity_neighborhood`,
so the frontend doesn't know or care which one served the request.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Asset, Document, ExtractedEntity


async def build_full_graph(db: AsyncSession) -> dict:
    nodes: list[dict] = []
    edges: list[dict] = []

    assets_result = await db.execute(select(Asset))
    assets = assets_result.scalars().all()
    asset_tags = {a.tag: a for a in assets}

    for asset in assets:
        nodes.append(
            {
                "id": f"asset:{asset.id}",
                "labels": ["Equipment"],
                "tag": asset.tag,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "health": asset.health.value,
            }
        )

    documents_result = await db.execute(select(Document))
    documents = documents_result.scalars().all()
    for doc in documents:
        nodes.append(
            {
                "id": f"document:{doc.id}",
                "labels": ["Document"],
                "filename": doc.filename,
                "doc_type": doc.doc_type.value,
            }
        )

    entities_result = await db.execute(
        select(ExtractedEntity).where(ExtractedEntity.entity_type == "equipment_tag")
    )
    entity_rows = entities_result.scalars().all()

    for entity in entity_rows:
        asset = asset_tags.get(entity.value)
        if asset is None:
            continue
        edges.append(
            {
                "id": f"edge:{entity.id}",
                "source": f"asset:{asset.id}",
                "target": f"document:{entity.document_id}",
                "type": "REFERENCED_IN",
            }
        )

    return {"nodes": nodes, "edges": edges, "source": "postgres_fallback"}


async def build_entity_neighborhood(db: AsyncSession, asset_tag: str) -> dict:
    full_graph = await build_full_graph(db)
    asset_node_id = next(
        (n["id"] for n in full_graph["nodes"] if n.get("tag") == asset_tag), None
    )
    if asset_node_id is None:
        return {"nodes": [], "edges": [], "source": "postgres_fallback"}

    connected_edges = [e for e in full_graph["edges"] if e["source"] == asset_node_id or e["target"] == asset_node_id]
    connected_ids = {asset_node_id} | {e["source"] for e in connected_edges} | {e["target"] for e in connected_edges}
    connected_nodes = [n for n in full_graph["nodes"] if n["id"] in connected_ids]

    return {"nodes": connected_nodes, "edges": connected_edges, "source": "postgres_fallback"}
