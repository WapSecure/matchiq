"""Phrase tables for the Analyst breakdown (MQ-068), one per locale.

Phrases never contain digits: every number comes from the evidence or `context.*` metrics and
is cited by its part. Placeholders: `{subject}`, `{opponent}` are allowlisted names (or the
generic subject); `{margin}`, `{minute}`, `{window}`, `{recent}`, `{average}`, `{other}`,
`{seconds}`, `{a}`, `{b}`, `{c}` are formatted metric values; `{label}` is a metric label.
"""

from collections.abc import Mapping
from dataclasses import dataclass

from matchiq_agents.contracts.types import InsightKind, MinutePhase, ScoreState, TrendDirection


@dataclass(frozen=True, slots=True)
class BreakdownBook:
    # "{subject} had won the ball back {seconds} seconds before the goal."
    regain: str
    # Score and minute, without the full stop: "{subject} lead by {margin} in minute {minute}".
    score: Mapping[ScoreState, str]
    # Clause appended to the score sentence, starting with its own comma; empty for none.
    phases: Mapping[MinutePhase, str]
    # The last `{window}` minutes against the match average, without the full stop.
    compare: str
    # Appended to `compare` when the opponent is known.
    compare_opponent: str
    # Spell-by-spell trend, RISING and FALLING only.
    trend: Mapping[TrendDirection, str]
    # The previous moment of the same kind for the same side.
    previous: Mapping[InsightKind, str]
    # Numberless "why it matters" line when the packet has no context.
    why_plain: Mapping[InsightKind, str]
    # Hedged, numberless pointers; a goal's depends on the score.
    watch: Mapping[InsightKind, str]
    watch_goal: Mapping[ScoreState, str]
