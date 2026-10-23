"""Deterministic editorial repairs (ADR-0011 addendum 3). Each one keeps the meaning provable:

- `LEAD_WITH_EVENT`: a goal or red-card headline that does not lead with the event, or a goal
  draft that never gives the score, gets the engine's own event line ("GOAL — Penbrook Town
  lead 3-2"), the same text the standard wording uses. The score's two metrics are added to
  the citations with their engine values. The replaced headline is a title, not a claim.
- `ADD_PLAYER`: when the evidence names the scorer or the dismissed player and the draft does
  not, the engine's sentence for that ("Ola Mensah scores for Penbrook Town.") is put first,
  only where the persona allows another sentence within its limits.
- `DROP_INDEX_SENTENCE`: a Fan or Broadcast sentence that shows an internal index value is
  deleted when another sentence remains; deleting a sentence removes a claim and adds none.

Every repair is logged on the trace, and the checks, editorial rules included, run afterwards.
A draft whose problem no repair can fix safely (a goal told as "2 goals recently") is rejected
and revised, then replaced by its standard wording.
"""

from dataclasses import dataclass
from typing import Final

from matchiq_agents.contracts.types import InsightKind, Persona
from matchiq_agents.domain.facts import FactView
from matchiq_agents.guard.editorial import (
    FAN_FACING,
    event_line,
    headline_issues,
    index_numerals,
    key_refs,
    score,
    scoreline_in,
)
from matchiq_agents.guard.editorial_lexicon import EVENT_KINDS
from matchiq_agents.guard.repair import Repair, sentences
from matchiq_agents.limits import OVERLAY_LIMITS, PERSONA_LIMITS, TextLimits
from matchiq_agents.templates.phrases_en import EN_GB

K = InsightKind
LEAD_WITH_EVENT: Final = "LEAD_WITH_EVENT"
ADD_PLAYER: Final = "ADD_PLAYER"
DROP_INDEX_SENTENCE: Final = "DROP_INDEX_SENTENCE"
LEAD_DETAIL: Final = "{field}: '{before}' replaced by the engine's event line '{after}'"
PLAYER_DETAIL: Final = "{field}: put the engine's line '{line}' first"
INDEX_DETAIL: Final = "{field}: removed '{sentence}', which showed an index value"


@dataclass(frozen=True, slots=True)
class EditorialCopy:
    headline: str
    body: str
    # Metric refs with engine values to add to the citations.
    cited: dict[str, float]


def _limits(persona: Persona | None) -> TextLimits:
    return OVERLAY_LIMITS if persona is None else PERSONA_LIMITS[persona]


def _lead(
    copy: EditorialCopy, view: FactView, persona: Persona | None, field: str, log: list[Repair]
) -> EditorialCopy:
    line = event_line(view, _limits(persona).headline_max)
    if line is None or line == copy.headline:
        return copy
    current = score(view) if view.kind is K.GOAL else None
    text = f"{copy.headline}\n{copy.body}"
    missing_score = current is not None and not scoreline_in(text, current)
    if not headline_issues(copy.headline, view) and not missing_score:
        return copy
    log.append(
        Repair(LEAD_WITH_EVENT, LEAD_DETAIL.format(field=field, before=copy.headline, after=line))
    )
    added = {ref: view.metrics[ref] for ref in key_refs(view)}
    return EditorialCopy(line, copy.body, {**copy.cited, **added})


def _player_line(view: FactView) -> str | None:
    if view.player_name is None or view.team_name is None or view.kind not in EVENT_KINDS:
        return None
    if view.kind is K.GOAL:
        clause = EN_GB.goal.scorer.format(player=view.player_name, team=view.team_name)
        return f"{clause}."
    return EN_GB.red_card.casual.format(player=view.player_name, team=view.team_name)


def _player(
    copy: EditorialCopy, view: FactView, limits: TextLimits, field: str, log: list[Repair]
) -> EditorialCopy:
    line, player = _player_line(view), view.player_name
    if line is None or player is None or player in f"{copy.headline}\n{copy.body}":
        return copy
    body = f"{line} {copy.body}".strip()
    count = len(sentences(body))
    if len(body) > limits.body_max or (
        limits.max_sentences is not None and count > limits.max_sentences
    ):
        return copy
    log.append(Repair(ADD_PLAYER, PLAYER_DETAIL.format(field=field, line=line)))
    return EditorialCopy(copy.headline, body, copy.cited)


def _drop_indices(
    copy: EditorialCopy, view: FactView, persona: Persona | None, field: str, log: list[Repair]
) -> EditorialCopy:
    if persona not in FAN_FACING:
        return copy
    parts = sentences(copy.body)
    kept = [part for part in parts if not index_numerals(part, copy.cited, view)]
    if not kept or len(kept) == len(parts):
        return copy
    for part in parts:
        if part not in kept:
            log.append(Repair(DROP_INDEX_SENTENCE, INDEX_DETAIL.format(field=field, sentence=part)))
    return EditorialCopy(copy.headline, " ".join(kept), copy.cited)


def repair_editorial(
    copy: EditorialCopy, persona: Persona | None, view: FactView, field: str, log: list[Repair]
) -> EditorialCopy:
    """Applies the editorial repairs to one en-GB draft (`persona`) or the overlay (`None`)."""
    copy = _lead(copy, view, persona, f"{field} headline", log)
    copy = _drop_indices(copy, view, persona, f"{field} body", log)
    return _player(copy, view, _limits(persona), f"{field} body", log)
