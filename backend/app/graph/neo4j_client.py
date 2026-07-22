"""
Neo4j knowledge graph client.

Genuine async Neo4j driver usage — real Cypher, not a stub. Requires a
running Neo4j instance (see `docker-compose.yml` at the project root).
If Neo4j isn't reachable, `app/api/v1/graph.py` catches the connection
error and falls back to `app/graph/fallback_graph.py`, which derives
an equivalent (smaller) graph directly from Postgres — so the
Knowledge Graph module is usable immediately without provisioning
Neo4j first, and upgrades transparently once it's running.
"""

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.core.config import settings

_driver: AsyncDriver | None = None


def get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
        )
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


async def upsert_equipment_node(tag: str, name: str, asset_type: str) -> None:
    query = """
    MERGE (e:Equipment {tag: $tag})
    SET e.name = $name, e.asset_type = $asset_type
    """
    async with get_driver().session() as session:
        await session.run(query, tag=tag, name=name, asset_type=asset_type)


async def link_document_entity(
    document_id: str, equipment_tag: str, relationship: str = "EXTRACTED_FROM"
) -> None:
    query = f"""
    MERGE (d:Document {{id: $document_id}})
    MERGE (e:Equipment {{tag: $equipment_tag}})
    MERGE (e)-[:{relationship}]->(d)
    """
    async with get_driver().session() as session:
        await session.run(query, document_id=document_id, equipment_tag=equipment_tag)


async def get_entity_neighborhood(tag: str, depth: int = 2) -> dict:
    """Returns {nodes: [...], edges: [...]} for the subgraph within
    `depth` hops of the given equipment tag."""
    query = f"""
    MATCH path = (e:Equipment {{tag: $tag}})-[*0..{depth}]-(related)
    RETURN path
    """
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    async with get_driver().session() as session:
        result = await session.run(query, tag=tag)
        async for record in result:
            path = record["path"]
            for node in path.nodes:
                node_id = str(node.element_id)
                if node_id not in nodes:
                    nodes[node_id] = {"id": node_id, "labels": list(node.labels), **dict(node)}
            for rel in path.relationships:
                edges.append(
                    {
                        "id": str(rel.element_id),
                        "source": str(rel.start_node.element_id),
                        "target": str(rel.end_node.element_id),
                        "type": rel.type,
                    }
                )

    return {"nodes": list(nodes.values()), "edges": edges}


async def health_check() -> bool:
    try:
        async with get_driver().session() as session:
            await session.run("RETURN 1")
        return True
    except Exception:  # noqa: BLE001 - any connectivity failure means "unavailable"
        return False
