"""Which engine metrics each key moment's standard wording states, chosen once for every locale.

Facts are picked by moment type and side, each metric at most once, so translations cite the
same values and no label repeats ("final third entries (away)" twice). Internal indices
(momentum) are kept apart: only the Analyst wording shows them, with their label.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from matchiq_agents.contracts.types import InsightKind
from matchiq_agents.domain.story import Window, find_ref, other_side
from matchiq_agents.roster.schemas import FactsPayload

K = InsightKind
W = Window
PLAYER_OWNER: Final = "player"
MOMENTUM: Final = "momentum"
PRESSURES: Final = "pressures"


class Owner(StrEnum):
    SUBJECT = "subject"
    OTHER = "other"
    PLAYER = "player"


S, OPP, P = Owner.SUBJECT, Owner.OTHER, Owner.PLAYER
Spec = tuple[str, Owner, Window]

# The first spec of a kind in `LEADING` is the fact its one-line wording states.
KIND_FACTS: Final[dict[InsightKind, tuple[Spec, ...]]] = {
    K.GOAL: (("shotsOnTarget", S, W.CURRENT), ("shots", S, W.CURRENT), ("shots", S, W.TOTAL),
             ("xg", S, W.TOTAL)),
    K.RED_CARD: (("redCards", S, W.TOTAL), ("fouls", S, W.TOTAL)),
    K.SHOT_BURST: (("shots", S, W.CURRENT), ("shotsOnTarget", S, W.CURRENT),
                   ("xg", S, W.CURRENT), ("shots", OPP, W.CURRENT)),
    K.HIGH_REGAINS: (("highRecoveries", S, W.CURRENT), ("recoveries", S, W.CURRENT),
                     ("highRecoveries", OPP, W.CURRENT), ("shots", S, W.CURRENT)),
    K.PRESSURE_SWING: (("pressures", S, W.CURRENT), ("highRecoveries", S, W.CURRENT),
                       ("pressures", OPP, W.CURRENT)),
    K.MOMENTUM_SHIFT: (("shots", S, W.CURRENT), ("finalThirdEntries", S, W.CURRENT),
                       ("possession", S, W.CURRENT)),
    K.PLAYER_MILESTONE: (("touches", P, W.TOTAL), ("passes", P, W.TOTAL), ("goals", P, W.TOTAL)),
}  # fmt: skip
LEADING: Final = frozenset({K.SHOT_BURST, K.HIGH_REGAINS, K.PRESSURE_SWING, K.PLAYER_MILESTONE})
MAX_FACTS: Final = 3


@dataclass(frozen=True, slots=True)
class Fact:
    ref: str
    owner: Owner
    # Previous-window ref when the value rose from it ("up from 6 in the previous spell").
    before: str | None = None

    def refs(self) -> tuple[str, ...]:
        return (self.ref,) if self.before is None else (self.ref, self.before)


@dataclass(frozen=True, slots=True)
class StoryFacts:
    lead: Fact | None
    extras: tuple[Fact, ...]
    # Subject and opponent momentum index refs, for the Analyst only.
    index: tuple[str, ...]


def _owner_key(owner: Owner, facts: FactsPayload) -> str | bool | None:
    """The ref segment for an owner; False when that owner cannot be named."""
    side = facts.subject_side
    if owner is Owner.PLAYER:
        return PLAYER_OWNER if facts.subject_player else False
    if owner is Owner.OTHER:
        return other_side(side) if side is not None and facts.opponent_team else False
    return side


def _rise(metrics: Mapping[str, float], ref: str, side: str | None) -> str | None:
    before = find_ref(metrics, PRESSURES, side, Window.PREVIOUS)
    return before if before is not None and metrics[before] < metrics[ref] else None


def _pick(facts: FactsPayload) -> list[Fact]:
    metrics = facts.computed_metrics
    picked: list[Fact] = []
    used: set[str] = set()
    for family, owner, window in KIND_FACTS[facts.insight_kind]:
        key = _owner_key(owner, facts)
        if key is False:
            continue
        ref = find_ref(metrics, family, key if isinstance(key, str) else None, window)
        # A zero supports nothing ("0 high recoveries"); only the leading fact may state one.
        if ref is None or ref in used or (picked and metrics[ref] == 0):
            continue
        before = None
        if family == PRESSURES and owner is Owner.SUBJECT and not picked:
            before = _rise(metrics, ref, facts.subject_side)
        fact = Fact(ref, owner, before)
        used.update(fact.refs())
        picked.append(fact)
    return picked[:MAX_FACTS]


def _index_refs(facts: FactsPayload) -> tuple[str, ...]:
    if facts.insight_kind is not K.MOMENTUM_SHIFT:
        return ()
    metrics, side = facts.computed_metrics, facts.subject_side
    mine = find_ref(metrics, MOMENTUM, side, Window.CURRENT)
    if mine is None:
        return ()
    theirs = None
    if side is not None and facts.opponent_team:
        theirs = find_ref(metrics, MOMENTUM, other_side(side), Window.CURRENT)
    return (mine,) if theirs is None else (mine, theirs)


def story_facts(facts: FactsPayload) -> StoryFacts:
    picked = _pick(facts)
    leads = facts.insight_kind in LEADING and bool(picked)
    lead = picked[0] if leads else None
    extras = tuple(picked[1:] if leads else picked)
    return StoryFacts(lead=lead, extras=extras, index=_index_refs(facts))
