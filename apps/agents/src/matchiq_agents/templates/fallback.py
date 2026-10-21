"""Deterministic fallback from engine metrics and the entity allowlist (provider `template`)."""

from collections.abc import Sequence
from typing import Final

from matchiq_agents.contracts.types import (
    AgentResult,
    Locale,
    NarrativeDraft,
    NarrativeSource,
    OverlayProposal,
    Persona,
)
from matchiq_agents.domain.facts import CANONICAL_LOCALE, FactView
from matchiq_agents.roster.convert import facts_payload, make_draft, to_analysis, to_overlay
from matchiq_agents.roster.schemas import (
    AnalystOutput,
    CitedValueOut,
    ClaimOut,
    DraftOut,
    FactsPayload,
)
from matchiq_agents.templates.phrases_en import EN_GB, INFERENCES
from matchiq_agents.templates.render import RenderedText, metric_item, render_text

TEMPLATE_VERSION: Final = "1.0.0"
MAX_OBSERVATIONS: Final = 4


def rendered_to_draft(
    rendered: RenderedText, persona: Persona, event_ids: Sequence[str]
) -> DraftOut:
    return DraftOut(
        persona=persona.value,
        headline=rendered.headline,
        body=rendered.body,
        evidence_event_ids=list(event_ids),
        cited_values=[CitedValueOut(metric_ref=ref, value=value) for ref, value in rendered.cited],
    )


def analyst_output(facts: FactsPayload, variant: int = 0) -> AnalystOutput:
    events = facts.event_ids
    casual = render_text(facts, Persona.CASUAL, Locale.en_GB, variant)
    claims = [_observation(casual.body, casual.cited, events)]
    for ref, value in list(facts.computed_metrics.items())[:MAX_OBSERVATIONS]:
        if all(ref != cited for cited, _ in casual.cited):
            item = metric_item(ref, value, Locale.en_GB)
            claims.append(_observation(f"{item[:1].upper()}{item[1:]}.", ((ref, value),), events))
    claims.append(
        ClaimOut(
            claim_type="INFERENCE",
            text=INFERENCES[facts.insight_kind],
            evidence_event_ids=list(events),
            cited_values=[],
        )
    )
    limitations = [EN_GB.limitation]
    if facts.data_coverage < 1:
        limitations.append(EN_GB.partial_coverage)
    return AnalystOutput(
        claims=claims, limitations=limitations, confidence_label=facts.confidence_label.value
    )


def _observation(text: str, cited: Sequence[tuple[str, float]], events: Sequence[str]) -> ClaimOut:
    return ClaimOut(
        claim_type="OBSERVATION",
        text=text,
        evidence_event_ids=list(events),
        cited_values=[CitedValueOut(metric_ref=ref, value=value) for ref, value in cited],
    )


class TemplateFallback:
    """Always produces contract-valid output that passes the deterministic checks."""

    def __init__(self, view: FactView) -> None:
        self._view = view
        self._facts = facts_payload(view)

    def analysis(self) -> AgentResult:
        return to_analysis(analyst_output(self._facts), self._view)

    def drafts(self, personas: Sequence[Persona], locale: Locale) -> list[NarrativeDraft]:
        return [self.draft(persona, locale) for persona in personas]

    def draft(self, persona: Persona, locale: Locale) -> NarrativeDraft:
        rendered = render_text(self._facts, persona, locale)
        out = rendered_to_draft(rendered, persona, self._view.event_ids)
        return make_draft(out, locale, NarrativeSource.TEMPLATE)

    def overlay(self) -> OverlayProposal:
        rendered = render_text(self._facts, Persona.BROADCAST, CANONICAL_LOCALE)
        refs = [ref for ref, _ in rendered.cited]
        return to_overlay(rendered.headline, rendered.body, refs, self._view)
