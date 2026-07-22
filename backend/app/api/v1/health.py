"""System health endpoint — used by orchestration (Docker/k8s) liveness
and readiness probes, and by the frontend to show connection status."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="industrialbrain-api", version="0.1.0")
