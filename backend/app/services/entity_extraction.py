

import re
from dataclasses import dataclass

from app.database.models import EntityType


@dataclass
class ExtractedEntityCandidate:
    entity_type: EntityType
    value: str
    confidence: float
    context_snippet: str


# Equipment tags: 1-2 letter class code + hyphen + 2-4 digits,
# e.g. P-101 (pump), C-204 (compressor), V-12 (valve), HX-301 (exchanger).
_EQUIPMENT_TAG_RE = re.compile(r"\b([A-Z]{1,3}-\d{2,4}[A-Z]?)\b")

# Regulatory/standard references, e.g. OISD-105, DGMS Circular 7,
# Factory Act §41, PESO/CCE/GA/2021.
_STANDARD_REF_RE = re.compile(
    r"\b(OISD[- ]\d{2,4}|DGMS(?: Circular)? \d+|Factory Act §?\s?\d+|PESO[\/\-][A-Z0-9\/]+)\b",
    re.IGNORECASE,
)

# Dates: DD/MM/YYYY, DD-MM-YYYY, or "12 January 2026" style.
_DATE_RE = re.compile(
    r"\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|"
    r"\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b",
    re.IGNORECASE,
)

# Pressure values: e.g. "12.5 bar", "150 psi", "3 MPa".
_PRESSURE_RE = re.compile(r"\b(\d+(?:\.\d+)?\s?(?:bar|psi|kPa|MPa))\b", re.IGNORECASE)

# Temperature values: e.g. "85°C", "185 F".
_TEMPERATURE_RE = re.compile(r"\b(\d+(?:\.\d+)?\s?°?\s?(?:C|F)\b)", re.IGNORECASE)

# Personnel roles mentioned in the text (not names — names need the LLM pass).
_ROLE_RE = re.compile(
    r"\b(Shift Supervisor|Safety Officer|Plant Manager|Maintenance Engineer|"
    r"Process Engineer|Inspector|Site Engineer)\b",
    re.IGNORECASE,
)

_PATTERNS: list[tuple[re.Pattern, EntityType, float]] = [
    (_EQUIPMENT_TAG_RE, EntityType.EQUIPMENT_TAG, 0.93),
    (_STANDARD_REF_RE, EntityType.STANDARD_REFERENCE, 0.9),
    (_DATE_RE, EntityType.DATE, 0.85),
    (_PRESSURE_RE, EntityType.PRESSURE_VALUE, 0.88),
    (_TEMPERATURE_RE, EntityType.TEMPERATURE_VALUE, 0.88),
    (_ROLE_RE, EntityType.PERSONNEL_ROLE, 0.8),
]

_CONTEXT_WINDOW = 40


def extract_entities(text: str) -> list[ExtractedEntityCandidate]:
    """Runs every pattern against the text once and returns deduplicated
    candidates, each with a surrounding context snippet for the UI."""
    seen: set[tuple[EntityType, str]] = set()
    results: list[ExtractedEntityCandidate] = []

    for pattern, entity_type, base_confidence in _PATTERNS:
        for match in pattern.finditer(text):
            value = match.group(1).strip()
            key = (entity_type, value.lower())
            if key in seen:
                continue
            seen.add(key)

            start = max(0, match.start() - _CONTEXT_WINDOW)
            end = min(len(text), match.end() + _CONTEXT_WINDOW)
            snippet = text[start:end].replace("\n", " ").strip()

            results.append(
                ExtractedEntityCandidate(
                    entity_type=entity_type,
                    value=value,
                    confidence=base_confidence,
                    context_snippet=snippet,
                )
            )

    return results
