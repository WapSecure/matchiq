"""Builds model payloads from facts, and converts model output into contract types.

Conversion re-validates against the generated (strict) contract models, so malformed output
raises `ValueError` and counts as a failed attempt.
"""

import re
from collections.abc import Callable, Collection, Iterable, Sequence
from typing import Final

from pydantic import ValidationError

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
from matchiq_agents.guard.editorial import event_line, key_refs
from matchiq_agents.guard.text import restore_names
from matchiq_agents.limits import OVERLAY_DURATION_MS, OVERLAY_PRIORITY
from matchiq_agents.pipeline.diagnostics import OutputRejectedError
from matchiq_agents.roster.schemas import (
    AnalystOutput,
    CitedValueOut,
    DraftOut,
    FactsPayload,
    MomentLabels,
    TextPair,
)

SCHEMA_VERSION: Final = 1
HASHTAG_REGEX: Final = re.compile(r"(?<!\w)#\w+")
NO_USABLE_DRAFT: Final = "model output has no usable draft for personas: {personas}"

OVERLAY_KINDS: Final[dict[InsightKind, OverlayKind]] = {
    InsightKind.GOAL: OverlayKind.SCORE_UPDATE,
    InsightKind.RED_CARD: OverlayKind.DISCIPLINE,
    InsightKind.SHOT_BURST: OverlayKind.KEY_MOMENT,
    InsightKind.HIGH_REGAINS: OverlayKind.TACTICAL_INSIGHT,
    InsightKind.PRESSURE_SWING: OverlayKind.TACTICAL_INSIGHT,
    InsightKind.MOMENTUM_SHIFT: OverlayKind.STAT_COMPARISON,
    InsightKind.PLAYER_MILESTONE: OverlayKind.KEY_MOMENT,
}


def moment_labels(view: FactView) -> MomentLabels | None:
    context = view.context
    if context is None:
        return None
    return MomentLabels(
        side=context.side.value,
        score_state=context.scoreState.value,
        phase=context.phase.value,
        compare_metric=context.comparison.metric.value if context.comparison else None,
        trend_metric=context.trend.metric.value if context.trend else None,
        trend_direction=context.trend.direction.value if context.trend else None,
    )


def facts_payload(
    view: FactView,
    *,
    free_text: bool = True,
    metric_refs: Collection[str] | None = None,
    context: bool = False,
) -> FactsPayload:
    """The data block for one agent, trimmed to what that agent needs (ADR-0011 addendum).

    `free_text=False` drops the engine's rationale and counter-evidence prose: only the Analyst
    (and the critique) reason over it, and small models otherwise copy its wording and numbers
    into drafts. `metric_refs` keeps only the metrics already cited upstream (a real packet has
    about 28), plus the metrics the moment's headline must state (the score after a goal).
    Output is checked against the full evidence either way. `context=True` (the Analyst) adds
    every `context.*` value and what they describe; other agents see only the ones cited upstream.
    """
    keep = None if metric_refs is None else {*metric_refs, *key_refs(view)}
    metrics = {ref: value for ref, value in view.metrics.items() if keep is None or ref in keep}
    metrics |= {
        ref: value
        for ref, value in view.context_metrics.items()
        if context or (keep is not None and ref in keep)
    }
    return FactsPayload(
        insight_kind=view.kind,
        subject_team=view.team_name,
        subject_player=view.player_name,
        subject_side=view.subject_side if view.team_name else None,
        opponent_team=view.opponent_name,
        event_line=event_line(view),
        computed_metrics=metrics,
        event_ids=list(view.event_ids),
        confidence_label=view.confidence,
        data_coverage=view.data_coverage,
        rationale=view.rationale if free_text else "",
        counter_evidence=list(view.counter_evidence) if free_text else [],
        entities=view.prompt_entities,
        moment_context=moment_labels(view) if context else None,
    )


def cited_out(values: Sequence[CitedValue]) -> list[CitedValueOut]:
    return [CitedValueOut(metric_ref=value.metricRef, value=value.value) for value in values]


def cited_refs(drafts: Iterable[NarrativeDraft]) -> set[str]:
    return {value.metricRef for draft in drafts for value in draft.citedValues}


def text_pairs(drafts: Sequence[NarrativeDraft]) -> list[TextPair]:
    return [TextPair(persona=d.persona, headline=d.headline, body=d.body) for d in drafts]


def to_analysis(output: AnalystOutput, view: FactView) -> AgentResult:
    return AgentResult.model_validate(
        {
            "schemaVersion": SCHEMA_VERSION,
            "runId": view.run_id,
            "agent": AgentName.MATCH_ANALYST,
            "claims": [
                {**claim.model_dump(), "text": tidy(claim.text, view.entity_names)}
                for claim in output.claims
            ],
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


def tidy(text: str, names: Iterable[str]) -> str:
    """Deterministic clean-up of model prose: canonical name capitals, no hashtags.

    Both edits only re-case allowlisted names or delete text, so they cannot add a claim; the
    Fact Checker still checks the result.
    """
    return " ".join(HASHTAG_REGEX.sub("", restore_names(text, names)).split())


def named(draft: DraftOut, names: Iterable[str]) -> DraftOut:
    return draft.model_copy(
        update={"headline": tidy(draft.headline, names), "body": tidy(draft.body, names)}
    )


def to_drafts(
    drafts: Sequence[DraftOut],
    personas: Sequence[Persona],
    locale: Locale,
    source: NarrativeSource,
    on_invalid: Callable[[Persona], None] | None = None,
) -> list[NarrativeDraft]:
    """Contract-valid drafts for the requested personas, in request order.

    A persona that is missing or invalid is left out for the Fact Checker to flag, so one bad
    persona never discards the others; output with no usable draft is a failed attempt.
    """
    by_persona: dict[Persona, NarrativeDraft] = {}
    for draft in drafts:
        persona = Persona(draft.persona)
        if persona not in personas or persona in by_persona:
            continue
        try:
            by_persona[persona] = make_draft(draft, locale, source)
        except ValidationError:
            if on_invalid is not None:
                on_invalid(persona)
            continue
    if not by_persona:
        names = ", ".join(p.value for p in personas)
        raise OutputRejectedError(NO_USABLE_DRAFT.format(personas=names))
    return [by_persona[persona] for persona in personas if persona in by_persona]


def to_overlay(
    headline: str, body: str, metric_refs: Sequence[str], view: FactView
) -> OverlayProposal:
    return OverlayProposal.model_validate(
        {
            "kind": OVERLAY_KINDS[view.kind],
            "priority": OVERLAY_PRIORITY[view.priority],
            "durationMs": OVERLAY_DURATION_MS[view.priority],
            "headline": tidy(headline, view.entity_names),
            "body": tidy(body, view.entity_names),
            "evidenceEventIds": list(view.event_ids),
            "metricRefs": list(dict.fromkeys(metric_refs)),
        }
    )
