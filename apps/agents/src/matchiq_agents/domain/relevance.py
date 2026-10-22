"""Relevance ranking of evidence metrics for the Match Analyst's prompt (input shaping).

A real packet carries about 28 metrics (two windows, both teams). Small models lose track of
which value belongs to which ref and cite mismatched pairs, so the Analyst sees only the top
metrics for the insight kind and subject. The checks still use the full evidence allowlist.

Ranking, best first: the current window over the previous one (the previous window matters
only for swings), then a family the insight kind is about, then the subject's side, then a
non-zero value. Ties keep the engine's order, so the ranking is deterministic.
"""

import re
from collections.abc import Mapping
from typing import Final

from matchiq_agents.contracts.types import InsightKind

ANALYST_METRIC_LIMIT: Final = 6
REF_PARTS: Final = re.compile(r"^(?P<family>[^.]+)\.(?P<side>[^.]+)(?:\.(?P<window>.+))?$")
PREVIOUS_WINDOW: Final = re.compile(r"^previous\d+m$")
SWING_KINDS: Final = frozenset({InsightKind.PRESSURE_SWING, InsightKind.MOMENTUM_SHIFT})

FAMILIES: Final[dict[InsightKind, tuple[str, ...]]] = {
    InsightKind.GOAL: ("goals", "shots", "shotsOnTarget", "xg"),
    InsightKind.RED_CARD: ("redCards", "fouls", "yellowCards"),
    InsightKind.SHOT_BURST: ("shots", "shotsOnTarget", "xg", "finalThirdEntries"),
    InsightKind.HIGH_REGAINS: ("highRecoveries", "recoveries", "pressures"),
    InsightKind.PRESSURE_SWING: ("pressures", "pressureDelta", "highRecoveries", "recoveries"),
    InsightKind.MOMENTUM_SHIFT: ("momentum", "possession", "shots", "finalThirdEntries"),
    InsightKind.PLAYER_MILESTONE: ("touches", "passes", "shots", "goals"),
}


def _score(
    ref: str, value: float, kind: InsightKind, side: str | None
) -> tuple[int, int, int, int]:
    match = REF_PARTS.match(ref)
    if match is None:
        return (1, 1, 1, 1)
    families = FAMILIES.get(kind, ())
    family = match.group("family")
    window = match.group("window") or ""
    is_previous = PREVIOUS_WINDOW.match(window) is not None
    return (
        1 if is_previous and kind not in SWING_KINDS else 0,
        families.index(family) if family in families else len(families),
        0 if side is None or match.group("side") in (side, "player") else 1,
        0 if value else 1,
    )


def ranked_refs(
    metrics: Mapping[str, float],
    kind: InsightKind,
    side: str | None,
    limit: int = ANALYST_METRIC_LIMIT,
) -> list[str]:
    order = {ref: index for index, ref in enumerate(metrics)}
    ranked = sorted(metrics, key=lambda ref: (_score(ref, metrics[ref], kind, side), order[ref]))
    return ranked[:limit]
