"""Deterministic rendering from engine facts only; shared by the template fallback and the mock."""

from dataclasses import dataclass
from typing import Final

from matchiq_agents.contracts.types import InsightKind, Locale, Persona
from matchiq_agents.limits import PERSONA_LIMITS
from matchiq_agents.roster.schemas import FactsPayload
from matchiq_agents.templates.metric_labels import metric_label, primary_metric, side_of
from matchiq_agents.templates.phrasebook import Phrasebook
from matchiq_agents.templates.phrases_en import EN_GB
from matchiq_agents.templates.phrases_es import ES_ES
from matchiq_agents.templates.phrases_fr import FR_FR
from matchiq_agents.templates.phrases_pcm import PCM_NG

PHRASEBOOKS: Final[dict[Locale, Phrasebook]] = {
    Locale.en_GB: EN_GB,
    Locale.fr_FR: FR_FR,
    Locale.es_ES: ES_ES,
    Locale.pcm_NG: PCM_NG,
}
MAX_DECIMALS: Final = 2
METRIC_SEPARATOR: Final = "; "
ANALYST_PUNCTUATION_SLACK: Final = 12


@dataclass(frozen=True, slots=True)
class RenderedText:
    headline: str
    body: str
    cited: tuple[tuple[str, float], ...]


def format_number(value: float, locale: Locale) -> str:
    if float(value).is_integer():
        return str(int(value))
    text = f"{round(value, MAX_DECIMALS):.{MAX_DECIMALS}f}".rstrip("0").rstrip(".")
    return text.replace(".", PHRASEBOOKS[locale].decimal_separator)


def subject_of(facts: FactsPayload, book: Phrasebook) -> str:
    if facts.insight_kind is InsightKind.PLAYER_MILESTONE and facts.subject_player:
        return facts.subject_player
    return facts.subject_team or facts.subject_player or book.generic_subject


def lead_of(facts: FactsPayload, locale: Locale, variant: int) -> str:
    book = PHRASEBOOKS[locale]
    options = book.leads[facts.insight_kind]
    return options[variant % len(options)].format(subject=subject_of(facts, book))


def labelled(metric_ref: str, locale: Locale) -> str:
    side = side_of(metric_ref)
    label = metric_label(metric_ref, locale)
    return f"{label} ({PHRASEBOOKS[locale].sides[side]})" if side else label


def metric_item(metric_ref: str, value: float, locale: Locale) -> str:
    return f"{labelled(metric_ref, locale)} {format_number(value, locale)}"


def _fit_metrics(facts: FactsPayload, budget: int) -> list[str]:
    """Metrics that fit `budget` in every locale, so translations keep the same numbers."""
    chosen: list[str] = []
    for ref in facts.computed_metrics:
        candidate = [*chosen, ref]
        if any(_metrics_length(facts, candidate, locale) > budget for locale in PHRASEBOOKS):
            break
        chosen.append(ref)
    return chosen


def _metrics_length(facts: FactsPayload, refs: list[str], locale: Locale) -> int:
    items = [metric_item(ref, facts.computed_metrics[ref], locale) for ref in refs]
    return len(METRIC_SEPARATOR.join(items))


def _headline(facts: FactsPayload, persona: Persona, locale: Locale, variant: int) -> str:
    """CASUAL leads with the story, ANALYST with the pattern and confidence, BROADCAST is terse."""
    book = PHRASEBOOKS[locale]
    short = book.shorts[facts.insight_kind]
    if persona is Persona.BROADCAST:
        return short
    if persona is Persona.ANALYST:
        confidence = book.confidence_labels[facts.confidence_label]
        return f"{short} ({book.confidence_title.lower()}: {confidence})"
    lead = lead_of(facts, locale, variant)
    return lead if len(lead) <= PERSONA_LIMITS[persona].headline_max else short


def _casual(facts: FactsPayload, locale: Locale, variant: int) -> tuple[str, list[str]]:
    book = PHRASEBOOKS[locale]
    lead = lead_of(facts, locale, variant)
    ref = primary_metric(facts.insight_kind, list(facts.computed_metrics))
    if ref is None:
        return book.qualitative.format(lead=lead), []
    value = format_number(facts.computed_metrics[ref], locale)
    return book.with_value.format(lead=lead, value=value, label=labelled(ref, locale)), [ref]


def _analyst_tail(facts: FactsPayload, book: Phrasebook) -> list[str]:
    tail = [f"{book.confidence_title}: {book.confidence_labels[facts.confidence_label]}."]
    if facts.counter_evidence:
        tail.append(book.counter_note)
    if facts.data_coverage < 1:
        tail.append(book.partial_coverage)
    tail.append(book.limitation)
    return tail


def _analyst_budget(facts: FactsPayload) -> int:
    """Worst case over locales and lead variants, so every locale cites the same metrics."""
    fixed = max(
        len(lead.format(subject=subject_of(facts, book)))
        + len(" ".join(_analyst_tail(facts, book)))
        + len(book.metrics_title)
        for book in PHRASEBOOKS.values()
        for lead in book.leads[facts.insight_kind]
    )
    return PERSONA_LIMITS[Persona.ANALYST].body_max - fixed - ANALYST_PUNCTUATION_SLACK


def _analyst(facts: FactsPayload, locale: Locale, variant: int) -> tuple[str, list[str]]:
    book = PHRASEBOOKS[locale]
    refs = _fit_metrics(facts, _analyst_budget(facts))
    parts = [f"{lead_of(facts, locale, variant)}."]
    if refs:
        items = [metric_item(ref, facts.computed_metrics[ref], locale) for ref in refs]
        parts.append(f"{book.metrics_title}: {METRIC_SEPARATOR.join(items)}.")
    return " ".join([*parts, *_analyst_tail(facts, book)]), refs


def _broadcast(facts: FactsPayload, locale: Locale, variant: int) -> tuple[str, list[str]]:
    refs = _fit_metrics(facts, PERSONA_LIMITS[Persona.BROADCAST].body_max - 1)
    if not refs:
        return PHRASEBOOKS[locale].shorts[facts.insight_kind] + ".", []
    items = [metric_item(ref, facts.computed_metrics[ref], locale) for ref in refs]
    body = METRIC_SEPARATOR.join(items)
    return body[:1].upper() + body[1:], refs


_BODIES: Final = {Persona.CASUAL: _casual, Persona.ANALYST: _analyst, Persona.BROADCAST: _broadcast}


def render_text(
    facts: FactsPayload, persona: Persona, locale: Locale, variant: int = 0
) -> RenderedText:
    body, refs = _BODIES[persona](facts, locale, variant)
    cited = tuple((ref, facts.computed_metrics[ref]) for ref in refs)
    return RenderedText(_headline(facts, persona, locale, variant), body, cited)
