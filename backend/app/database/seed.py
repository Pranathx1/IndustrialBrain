"""
Seed script — populates realistic demo data so the dashboard, RCA, and
Knowledge Graph all have something real to show immediately.

Run with:
    python -m app.database.seed
"""

import asyncio
from datetime import datetime, timedelta

from app.database.models import (
    Asset,
    AssetHealth,
    Incident,
    IncidentSeverity,
    MaintenanceEvent,
    MaintenanceEventType,
)
from app.database.session import AsyncSessionLocal, Base, engine


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        assets = [
            Asset(tag="P-101", name="Feed Pump 101", asset_type="Pump", facility="Vizag Plant",
                  health=AssetHealth.WARNING, install_date=datetime(2018, 4, 12),
                  last_inspection_date=datetime.utcnow() - timedelta(days=12)),
            Asset(tag="B-204", name="Boiler 204", asset_type="Boiler", facility="Vizag Plant",
                  health=AssetHealth.CRITICAL, install_date=datetime(2016, 9, 3),
                  last_inspection_date=datetime.utcnow() - timedelta(days=3)),
            Asset(tag="V-17", name="Relief Valve 17", asset_type="Valve", facility="Vizag Plant",
                  health=AssetHealth.HEALTHY, install_date=datetime(2020, 1, 20),
                  last_inspection_date=datetime.utcnow() - timedelta(days=40)),
            Asset(tag="HX-301", name="Heat Exchanger 301", asset_type="Heat Exchanger", facility="Chennai Plant",
                  health=AssetHealth.HEALTHY, install_date=datetime(2019, 6, 15),
                  last_inspection_date=datetime.utcnow() - timedelta(days=25)),
            Asset(tag="T-88", name="Storage Tank 88", asset_type="Tank", facility="Chennai Plant",
                  health=AssetHealth.WARNING, install_date=datetime(2015, 11, 2),
                  last_inspection_date=datetime.utcnow() - timedelta(days=60)),
        ]
        db.add_all(assets)
        await db.flush()
        by_tag = {a.tag: a for a in assets}

        maintenance = [
            MaintenanceEvent(
                asset_id=by_tag["B-204"].id, event_type=MaintenanceEventType.COMPLETED,
                title="Quarterly inspection",
                description="Routine quarterly inspection — vibration within tolerance at the time.",
                scheduled_date=datetime.utcnow() - timedelta(days=45),
            ),
            MaintenanceEvent(
                asset_id=by_tag["B-204"].id, event_type=MaintenanceEventType.PREDICTED,
                title="Bearing replacement recommended", risk_score=78.0,
                description="Vibration trend suggests bearing wear; failure risk rising over the last 3 inspections.",
                scheduled_date=datetime.utcnow() + timedelta(days=34),
                recommendation="Schedule bearing replacement within 34 days to avoid unplanned downtime.",
            ),
            MaintenanceEvent(
                asset_id=by_tag["P-101"].id, event_type=MaintenanceEventType.UPCOMING,
                title="Scheduled seal inspection", description="Routine annual seal inspection.",
                scheduled_date=datetime.utcnow() + timedelta(days=14),
            ),
            MaintenanceEvent(
                asset_id=by_tag["T-88"].id, event_type=MaintenanceEventType.PREDICTED,
                title="Corrosion monitoring follow-up", risk_score=42.0,
                description="Wall-thickness readings trending down at a moderate rate.",
                scheduled_date=datetime.utcnow() + timedelta(days=60),
                recommendation="Schedule ultrasonic thickness re-test within 60 days.",
            ),
        ]
        db.add_all(maintenance)

        incidents = [
            Incident(
                asset_id=by_tag["P-101"].id, title="Vibration event",
                description="Elevated vibration readings detected during routine monitoring; pump shut down as precaution.",
                severity=IncidentSeverity.MINOR, occurred_at=datetime.utcnow() - timedelta(days=6),
            ),
            Incident(
                asset_id=by_tag["B-204"].id, title="High discharge temperature alarm",
                description="Discharge temperature exceeded threshold for 4 minutes before automatic trip.",
                severity=IncidentSeverity.MAJOR, occurred_at=datetime.utcnow() - timedelta(days=2),
            ),
            Incident(
                asset_id=by_tag["T-88"].id, title="Minor leak detected near base weld",
                description="Small leak observed near the tank base weld seam during routine walkdown.",
                severity=IncidentSeverity.NEAR_MISS, occurred_at=datetime.utcnow() - timedelta(days=10),
            ),
        ]
        db.add_all(incidents)

        await db.commit()
        print("Seed complete: 5 assets, 4 maintenance events, 3 incidents.")


if __name__ == "__main__":
    asyncio.run(seed())
