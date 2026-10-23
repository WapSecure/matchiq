"""What a key moment is about, from engine metrics only: the score after a goal, and which
metric states each fact. Shared by the editorial rules (`guard/editorial.py`) and the template
fallback, so both tell the same story. Pure; no model calls and no wording.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from matchiq_agents.contracts.generated.MetricDisplay import InternalIndexMetric

SIDES: Final = ("home", "away")
GOALS: Final = "goals"
CURRENT_PREFIX: Final = "rolling"
PREVIOUS_PREFIX: Final = "previous"
TOTAL_WINDOWS: Final = frozenset({"match", "total"})
INTERNAL_INDEX_FAMILIES: Final = frozenset(member.value for member in InternalIndexMetric)


class Window(StrEnum):
    CURRENT = "current"
    PREVIOUS = "previous"
    TOTAL = "total"


class GoalState(StrEnum):
    LEAD = "lead"
    LEVEL = "level"
    TRAIL = "trail"


def family_of(metric_ref: str) -> str:
    return metric_ref.split(".", 1)[0]


def is_internal_index(metric_ref: str) -> bool:
    return family_of(metric_ref) in INTERNAL_INDEX_FAMILIES


def side_of(metric_ref: str) -> str | None:
    return next((part for part in metric_ref.split(".")[1:] if part in SIDES), None)


def other_side(side: str) -> str:
    return SIDES[1] if side == SIDES[0] else SIDES[0]


def window_of(metric_ref: str) -> Window:
    last = metric_ref.rsplit(".", 1)[-1]
    if last.startswith(CURRENT_PREFIX):
        return Window.CURRENT
    if last.startswith(PREVIOUS_PREFIX):
        return Window.PREVIOUS
    return Window.TOTAL


def find_ref(
    metrics: Mapping[str, float], family: str, owner: str | None, window: Window
) -> str | None:
    """The first metric of `family` for `owner` (a side, or "player") in `window`."""
    for ref in metrics:
        parts = ref.split(".")
        if parts[0] != family or window_of(ref) is not window:
            continue
        if owner is None or owner in parts[1:]:
            return ref
    return None


@dataclass(frozen=True, slots=True)
class Score:
    """The score after a goal, seen from the subject (scoring) side."""

    side: str
    subject: int
    other: int
    subject_ref: str
    other_ref: str

    @property
    def home(self) -> int:
        return self.subject if self.side == SIDES[0] else self.other

    @property
    def away(self) -> int:
        return self.other if self.side == SIDES[0] else self.subject

    @property
    def state(self) -> GoalState:
        if self.subject > self.other:
            return GoalState.LEAD
        return GoalState.LEVEL if self.subject == self.other else GoalState.TRAIL

    @property
    def cited(self) -> tuple[tuple[str, float], tuple[str, float]]:
        return (self.subject_ref, float(self.subject)), (self.other_ref, float(self.other))


def _goal_ref(metrics: Mapping[str, float], side: str) -> str | None:
    return find_ref(metrics, GOALS, side, Window.TOTAL)


def score_of(metrics: Mapping[str, float], side: str | None) -> Score | None:
    """The match score from `goals.home` and `goals.away`; None unless both are known."""
    if side is None:
        return None
    mine, theirs = _goal_ref(metrics, side), _goal_ref(metrics, other_side(side))
    if mine is None or theirs is None:
        return None
    values = (metrics[mine], metrics[theirs])
    if not all(float(value).is_integer() and value >= 0 for value in values):
        return None
    return Score(side, int(values[0]), int(values[1]), mine, theirs)
