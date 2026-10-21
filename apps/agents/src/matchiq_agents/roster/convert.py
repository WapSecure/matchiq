"""Builds model payloads from facts, and converts model output into contract types.

Conversion re-validates against the generated (strict) contract models, so malformed output
raises `ValueError` and counts as a failed attempt.
"""

from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import (
    AgentName,
    AgentResult,
    CitedValue,
    InsightKind,
    Locale,
    NarrativeDraft,
    NarrativeSource,
    OverlayKind,
    OverlayProposal,
    Persona,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE, FactView
from matchiq_agents.limits import OVERLAY_DURATION_MS, OVERLAY_PRIORITY
from matchiq_agents.roster.schemas import (
    AnalystOutput,
    CitedValueOut,
    DraftOut,
    FactsPayload,
    TextPair,
)

SCHEMA_VERSION: Final = 1
MISSING_PERSONAS: Final = "model output is missing personas: {personas}"

OVERLAY_KINDS: Final[dict[InsightKind, OverlayKind]] = {
    InsightKind.GOAL: OverlayKind.SCORE_UPDATE,
    InsightKind.RED_CARD: OverlayKind.DISCIPLINE,
    InsightKind.SHOT_BURST: OverlayKind.KEY_MOMENT,
    InsightKind.HIGH_REGAINS: OverlayKind.TACTICAL_INSIGHT,
    InsightKind.PRESSURE_SWING: OverlayKind.TACTICAL_INSIGHT,
    InsightKind.MOMENTUM_SHIFT: OverlayKind.STAT_COMPARISON,
    InsightKind.PLAYER_MILESTONE: OverlayKind.KEY_MOMENT,
}


def facts_payload(view: FactView) -> FactsPayload:
    return FactsPayload(
        insight_kind=view.kind,
        subject_team=view.team_name,
        subject_player=view.player_name,
        computed_metrics=dict(view.metrics),
        event_ids=list(view.event_ids),
        confidence_label=view.confidence,
        data_coverage=view.data_coverage,
        rationale=view.rationale,
        counter_evidence=list(view.counter_evidence),
        entities=sorted(view.entity_names),
    )


def cited_out(values: Sequence[CitedValue]) -> list[CitedValueOut]:
    return [CitedValueOut(metric_ref=value.metricRef, value=value.value) for value in values]


def text_pairs(drafts: Sequence[NarrativeDraft]) -> list[TextPair]:
    return [TextPair(persona=d.persona, headline=d.headline, body=d.body) for d in drafts]


def to_analysis(output: AnalystOutput, view: FactView) -> AgentResult:
    return AgentResult.model_validate(
        {
            "schemaVersion": SCHEMA_VERSION,
            "runId": view.run_id,
            "agent": AgentName.MATCH_ANALYST,
            "claims": [claim.model_dump() for claim in output.claims],
            "limitations": output.limitations,
            "locale": CANONICAL_LOCALE,
            "confidenceLabel": output.confidence_label,
            "traceId": str(view.correlation_id),
        }
    )


def make_draft(draft: DraftOut, locale: Locale, source: NarrativeSource) -> NarrativeDraft:
    return NarrativeDraft.model_validate(
        {**draft.model_dump(), "locale": locale, "source": source, "localeFallback": False}
    )


def to_drafts(
    drafts: Sequence[DraftOut], personas: Sequence[Persona], locale: Locale, source: NarrativeSource
) -> list[NarrativeDraft]:
    """One draft per requested persona, in request order; anything else is a failed attempt."""
    by_persona = {Persona(draft.persona): draft for draft in drafts}
    missing = [persona.value for persona in personas if persona not in by_persona]
    if missing:
        raise ValueError(MISSING_PERSONAS.format(personas=", ".join(missing)))
    return [make_draft(by_persona[persona], locale, source) for persona in personas]


def to_overlay(
    headline: str, body: str, metric_refs: Sequence[str], view: FactView
) -> OverlayProposal:
    return OverlayProposal.model_validate(
        {
            "kind": OVERLAY_KINDS[view.kind],
            "priority": OVERLAY_PRIORITY[view.priority],
            "durationMs": OVERLAY_DURATION_MS[view.priority],
            "headline": headline,
            "body": body,
            "evidenceEventIds": list(view.event_ids),
            "metricRefs": list(dict.fromkeys(metric_refs)),
        }
    )
