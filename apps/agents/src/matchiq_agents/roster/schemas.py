"""Model-facing payloads and structured-output schemas.

Response models are strict (`extra="forbid"`), have no defaults and no length or pattern
constraints, so they translate cleanly to OpenAI strict JSON schema. Contract constraints are
enforced afterwards, when the output is converted into the generated contract types.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind, Locale, Persona

PersonaName = Literal["CASUAL", "ANALYST", "BROADCAST"]
# Every `Locale` except the canonical en-GB; `tests/test_providers.py` pins the parity.
TargetLocaleName = Literal["fr-FR", "es-ES", "pcm-NG"]


class StrictModel(BaseModel):
    """camelCase on the wire (matching the contracts), snake_case in Python."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
    )


class FactsPayload(StrictModel):
    insight_kind: InsightKind
    subject_team: str | None
    subject_player: str | None
    # "home" or "away": which side of the metric refs (`goals.home`) is the subject team.
    subject_side: str | None
    opponent_team: str | None
    # The engine's own headline for a goal or red card ("GOAL — Penbrook Town lead 3-2").
    event_line: str | None
    computed_metrics: dict[str, float]
    event_ids: list[str]
    confidence_label: ConfidenceLabel
    data_coverage: float
    rationale: str
    counter_evidence: list[str]
    entities: list[str]


class AnalystInput(StrictModel):
    facts: FactsPayload
    # Violations of the previous attempt, with the fix; empty on the first attempt.
    revision_notes: list[str]


class CitedValueOut(StrictModel):
    metric_ref: str
    value: float


class ClaimOut(StrictModel):
    claim_type: Literal["OBSERVATION", "INFERENCE"]
    text: str
    evidence_event_ids: list[str]
    cited_values: list[CitedValueOut]


class AnalystOutput(StrictModel):
    claims: list[ClaimOut]
    limitations: list[str]
    confidence_label: Literal["low", "medium", "high"]


class WriterInput(StrictModel):
    facts: FactsPayload
    claims: list[ClaimOut]
    limitations: list[str]
    personas: list[Persona]
    locale: Locale
    revision_notes: list[str]


class DraftOut(StrictModel):
    persona: PersonaName
    headline: str
    body: str
    evidence_event_ids: list[str]
    cited_values: list[CitedValueOut]


class WriterOutput(StrictModel):
    drafts: list[DraftOut]


class TextPair(StrictModel):
    persona: Persona
    headline: str
    body: str


class CritiqueInput(StrictModel):
    facts: FactsPayload
    drafts: list[TextPair]


class CritiqueOutput(StrictModel):
    verdict: Literal["PASS", "REVISE"]
    concerns: list[str]


class ItemRef(StrictModel):
    locale: TargetLocaleName
    persona: PersonaName


class LocalizationInput(StrictModel):
    """One batched call: every source draft into every target locale.

    `required_items` spells out each (locale, persona) pair to return, so the model does not
    infer the item set from the example (ADR-0011 addendum 2).
    """

    facts: FactsPayload
    source_locale: Locale
    target_locales: list[Locale]
    drafts: list[TextPair]
    required_items: list[ItemRef]
    protected_terms: list[str]


class LocalizedOut(StrictModel):
    locale: TargetLocaleName
    persona: PersonaName
    headline: str
    body: str


class LocalizationOutput(StrictModel):
    drafts: list[LocalizedOut]


class ProducerInput(StrictModel):
    facts: FactsPayload
    broadcast_draft: TextPair
    headline_max: int
    body_max: int
    revision_notes: list[str]


class ProducerOutput(StrictModel):
    headline: str
    body: str
    metric_refs: list[str]
