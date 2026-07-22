"""Root Cause Analysis endpoints — list incidents, run analysis on a selected one."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Asset, Incident
from app.database.session import get_db
from app.services.rca_engine import analyze_incident

router = APIRouter(prefix="/rca", tags=["root-cause-analysis"])


class IncidentOut(BaseModel):
    id: str
    asset_tag: str
    asset_name: str
    title: str
    description: str
    severity: str
    occurred_at: str


class EvidenceOut(BaseModel):
    source: str
    detail: str


class CandidateCauseOut(BaseModel):
    cause: str
    confidence: float
    evidence: list[EvidenceOut]
    recommendation: str


class TimelineEntryOut(BaseModel):
    date: str
    label: str
    type: str


class SimilarIncidentOut(BaseModel):
    id: str
    title: str
    occurred_at: str
    severity: str


class RCAAnalysisOut(BaseModel):
    incident_id: str
    candidate_causes: list[CandidateCauseOut]
    similar_incidents: list[SimilarIncidentOut]
    timeline: list[TimelineEntryOut]


@router.get("/incidents", response_model=list[IncidentOut])
async def list_incidents(db: AsyncSession = Depends(get_db)) -> list[IncidentOut]:
    result = await db.execute(select(Incident).order_by(Incident.occurred_at.desc()))
    incidents = result.scalars().all()

    asset_result = await db.execute(select(Asset))
    assets_by_id = {a.id: a for a in asset_result.scalars().all()}

    return [
        IncidentOut(
            id=i.id,
            asset_tag=assets_by_id[i.asset_id].tag if i.asset_id in assets_by_id else "Unknown",
            asset_name=assets_by_id[i.asset_id].name if i.asset_id in assets_by_id else "Unknown asset",
            title=i.title,
            description=i.description,
            severity=i.severity.value,
            occurred_at=i.occurred_at.isoformat(),
        )
        for i in incidents
    ]


@router.post("/analyze/{incident_id}", response_model=RCAAnalysisOut)
async def analyze(incident_id: str, db: AsyncSession = Depends(get_db)) -> RCAAnalysisOut:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found.")

    analysis = await analyze_incident(db, incident)

    return RCAAnalysisOut(
        incident_id=analysis.incident_id,
        candidate_causes=[
            CandidateCauseOut(
                cause=c.cause,
                confidence=c.confidence,
                evidence=[EvidenceOut(source=e.source, detail=e.detail) for e in c.evidence],
                recommendation=c.recommendation,
            )
            for c in analysis.candidate_causes
        ],
        similar_incidents=[SimilarIncidentOut(**s) for s in analysis.similar_incidents],
        timeline=[TimelineEntryOut(**t) for t in analysis.timeline],
    )
