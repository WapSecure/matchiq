"""Applies the deterministic repairs in `guard/repair.py` to each agent's output.

Repairs run after the name clean-up and before the deterministic checks, which still decide
acceptance. Each one is appended to the call's repair log, which the runner records on the
`AgentRun` of the accepted output.
"""

from collections.abc import Iterable, Sequence
from typing import Final

from matchiq_agents.contracts.types import Locale, Persona
from matchiq_agents.domain.facts import CANONICAL_LOCALE, FactView
from matchiq_agents.guard.repair import Repair, drop_windows, metric_windows, trim_sentences
from matchiq_agents.guard.text import extract_numerals
from matchiq_agents.limits import OVERLAY_LIMITS, PERSONA_LIMITS
from matchiq_agents.roster.schemas import ClaimOut, DraftOut

ADD_METRIC_REF: Final = "ADD_METRIC_REF"
REF_DETAIL: Final = "overlay: listed {ref}, whose value the text states"


def repair_text(
    text: str,
    view: FactView,
    values: Iterable[float],
    field: str,
    log: list[Repair],
    locale: Locale = CANONICAL_LOCALE,
) -> str:
    repaired, found = drop_windows(text, locale, metric_windows(view.metrics), values, field)
    log.extend(found)
    return repaired


def repair_body(body: str, persona: Persona | None, field: str, log: list[Repair]) -> str:
    limits = PERSONA_LIMITS[persona] if persona is not None else OVERLAY_LIMITS
    trimmed, found = trim_sentences(body, limits, field)
    if found is not None:
        log.append(found)
    return trimmed


def repair_draft(draft: DraftOut, view: FactView, log: list[Repair]) -> DraftOut:
    persona = Persona(draft.persona)
    values = [value.value for value in draft.cited_values]
    tag = persona.value
    headline = repair_text(draft.headline, view, values, f"{tag} headline", log)
    body = repair_text(draft.body, view, values, f"{tag} body", log)
    body = repair_body(body, persona, f"{tag} body", log)
    return draft.model_copy(update={"headline": headline, "body": body})


def repair_claim(claim: ClaimOut, view: FactView, index: int, log: list[Repair]) -> ClaimOut:
    values = [value.value for value in claim.cited_values]
    text = repair_text(claim.text, view, values, f"claim {index}", log)
    return claim.model_copy(update={"text": text})


def repair_limitation(text: str, view: FactView, index: int, log: list[Repair]) -> str:
    return repair_text(text, view, [], f"limitation {index}", log)


def overlay_refs(
    text: str, listed: Sequence[str], cited: dict[str, float], log: list[Repair]
) -> list[str]:
    """Adds the ref of each number the overlay states that the approved draft cited.

    Only the broadcast draft's own cited metrics qualify, and only when exactly one of them
    has that value, so the added ref is never a guess between metrics.
    """
    refs = list(dict.fromkeys(listed))
    for numeral in extract_numerals(text, CANONICAL_LOCALE):
        matches = [ref for ref, value in cited.items() if numeral.represents(value)]
        if len(matches) == 1 and matches[0] not in refs:
            refs.append(matches[0])
            log.append(Repair(ADD_METRIC_REF, REF_DETAIL.format(ref=matches[0])))
    return refs
