"""Aggregates every `/api/v1/*` route module into one router."""

from fastapi import APIRouter

from app.api.v1 import copilot, dashboard, documents, graph, health, rca

router = APIRouter()
router.include_router(health.router)
router.include_router(dashboard.router)
router.include_router(documents.router)
router.include_router(rca.router)
router.include_router(graph.router)
router.include_router(copilot.router)
