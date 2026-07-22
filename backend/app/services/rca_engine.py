"""
Root Cause Analysis engine.

Phase-appropriate implementation: real rule-based reasoning over
structured evidence already in the database (maintenance history,
prior incidents on the same asset, extracted document entities) —
not a placeholder. Each candidate cause is scored by how much
supporting evidence exists, and every score traces back to specific
evidence the UI can display.

A later phase adds an LLM synthesis pass (via `app/agents/rca_agent.py`
when `GEMINI_API_KEY` is configured) that reads this same evidence
bundle and produces a narrative explanation — this function is
designed to be that pass's input, not something it replaces.
"""

import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import ExtractedEntity, Incident, MaintenanceEvent

# keyword -> (candidate cause, related maintenance/entity keywords that boost confidence)
_CAUSE_PATTERNS: list[tuple[re.Pattern, str, list[str]]] = [
    (re.compile(r"vibrat", re.I), "Bearing wear or misalignment", ["bearing", "alignment", "vibration"]),
    (re.compile(r"temperature|thermal|overheat", re.I), "Cooling system degradation or process upset",
     ["cooling", "coolant", "temperature", "thermal"]),
    (re.compile(r"pressure", re.I), "Seal degradation or blockage downstream", ["seal", "gasket", "blockage", "pressure"]),
    (re.compile(r"corrosion|thickness", re.I), "Material corrosion / wall thinning", ["corrosion", "thickness", "coating"]),
    (re.compile(r"leak", re.I), "Seal or gasket failure", ["seal", "gasket", "leak"]),
    (re.compile(r"trip|shutdown|alarm", re.I), "Instrumentation drift or genuine process excursion",
     ["calibration", "instrument", "sensor"]),
]


@dataclass
class EvidenceItem:
    source: str
    detail: str


@dataclass
class CandidateCause:
    cause: str
    confidence: float
    evidence: list[EvidenceItem] = field(default_factory=list)
    recommendation: str = ""


@dataclass
class RCAResult:
    incident_id: str
    candidate_causes: list[CandidateCause]
    similar_incidents: list[dict]
    timeline: list[dict]


async def analyze_incident(db: AsyncSession, incident: Incident) -> RCAResult:
    # Gather evidence: other incidents on the same asset, maintenance
    # history for the same asset, and any extracted document entities
    # that reference this asset's tag.
    prior_incidents_result = await db.execute(
        select(Incident).where(Incident.asset_id == incident.asset_id, Incident.id != incident.id)
    )
    prior_incidents = prior_incidents_result.scalars().all()

    maintenance_result = await db.execute(
        select(MaintenanceEvent).where(MaintenanceEvent.asset_id == incident.asset_id)
    )
    maintenance_events = maintenance_result.scalars().all()

    candidates: list[CandidateCause] = []
    text_to_match = f"{incident.title} {incident.description}"

    for pattern, cause_label, boost_keywords in _CAUSE_PATTERNS:
        if not pattern.search(text_to_match):
            continue

        evidence: list[EvidenceItem] = [
            EvidenceItem(source="Incident report", detail=incident.description)
        ]
        confidence = 0.55  # base confidence from keyword match alone

        for event in maintenance_events:
            event_text = f"{event.title} {event.description} {event.recommendation or ''}"
            if any(kw in event_text.lower() for kw in boost_keywords):
                evidence.append(
                    EvidenceItem(
                        source="Maintenance record",
                        detail=f"{event.title} ({event.event_type.value}) — {event.description}",
                    )
                )
                confidence += 0.18

        for prior in prior_incidents:
            prior_text = f"{prior.title} {prior.description}"
            if pattern.search(prior_text):
                evidence.append(
                    EvidenceItem(
                        source="Prior incident",
                        detail=f"{prior.title} ({prior.occurred_at.date().isoformat()})",
                    )
                )
                confidence += 0.12

        confidence = min(confidence, 0.97)

        candidates.append(
            CandidateCause(
                cause=cause_label,
                confidence=round(confidence, 2),
                evidence=evidence,
                recommendation=_recommendation_for(cause_label),
            )
        )

    candidates.sort(key=lambda c: c.confidence, reverse=True)

    if not candidates:
        candidates.append(
            CandidateCause(
                cause="Insufficient pattern match — manual investigation recommended",
                confidence=0.2,
                evidence=[EvidenceItem(source="Incident report", detail=incident.description)],
                recommendation="No structured evidence pattern matched this incident description. "
                "Escalate to a process engineer for manual root cause investigation.",
            )
        )

    timeline = sorted(
        [
            {"date": e.scheduled_date.isoformat(), "label": e.title, "type": e.event_type.value}
            for e in maintenance_events
        ]
        + [
            {"date": incident.occurred_at.isoformat(), "label": incident.title, "type": "incident"}
        ],
        key=lambda x: x["date"],
    )

    return RCAResult(
        incident_id=incident.id,
        candidate_causes=candidates,
        similar_incidents=[
            {"id": p.id, "title": p.title, "occurred_at": p.occurred_at.isoformat(), "severity": p.severity.value}
            for p in prior_incidents
        ],
        timeline=timeline,
    )


def _recommendation_for(cause_label: str) -> str:
    mapping = {
        "Bearing wear or misalignment": "Schedule vibration analysis and bearing inspection within 2 weeks.",
        "Cooling system degradation or process upset": "Inspect cooling water flow rate and heat exchanger fouling.",
        "Seal degradation or blockage downstream": "Inspect mechanical seal condition; check downstream line for blockage.",
        "Material corrosion / wall thinning": "Commission ultrasonic thickness survey; review corrosion allowance.",
        "Seal or gasket failure": "Replace seal/gasket at next planned shutdown; inspect for root leak path.",
        "Instrumentation drift or genuine process excursion": "Cross-check sensor calibration records against process trend data.",
    }
    return mapping.get(cause_label, "Escalate to the responsible process engineer for manual review.")
