"""Locale phrase tables used by the deterministic template fallback and the mock provider.

Phrases never contain numbers: every number in rendered text comes from `computedMetrics`.
Placeholders: `{subject}`, `{team}`, `{player}`, `{other}` are allowlisted names; `{value}`,
`{before}`, `{s}`, `{o}`, `{h}`, `{a}` are formatted metric values; `{label}` is a metric label
and `{window}` a window phrase ("recently").
"""

from collections.abc import Mapping
from dataclasses import dataclass

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.domain.story import GoalState, Window


@dataclass(frozen=True, slots=True)
class GoalPhrases:
    # Headline per state, scorer side first: "GOAL — {team} lead {s}-{o}".
    headlines: Mapping[GoalState, str]
    headline_unscored: str
    # One sentence: "{scorer}{state}." where the state clause starts with its own comma.
    scorer: str
    scorer_unnamed: str
    states: Mapping[GoalState, str]
    # Broadcast caption: "{scorer}: {home} {h}-{a} {away}."
    scoreboard: str


@dataclass(frozen=True, slots=True)
class RedCardPhrases:
    casual: str
    casual_unnamed: str
    caption: str
    caption_unnamed: str


@dataclass(frozen=True, slots=True)
class Phrasebook:
    # Headline leads per kind, no numbers; two variants.
    leads: Mapping[InsightKind, tuple[str, ...]]
    # Short headline used when a lead is too long for the persona.
    shorts: Mapping[InsightKind, str]
    # One-sentence bodies without numbers: (casual, broadcast).
    plain: Mapping[InsightKind, tuple[str, str]]
    generic_subject: str
    # "{subject} have {value} {label} {window}."
    fact: str
    # "{subject} has {value} {label} {window}." for a player.
    fact_player: str
    # "{value} {label} for {subject} {window}."
    caption: str
    # "{subject} have {value} {label} {window}, up from {before} {previous}."
    rise: str
    windows: Mapping[Window, str]
    goal: GoalPhrases
    red_card: RedCardPhrases
    # "Momentum index (a descriptive scale, not a forecast): {subject} {value}, {other} {before}."
    index_pair: str
    index_single: str
    confidence: str
    confidence_labels: Mapping[ConfidenceLabel, str]
    counter_note: str
    limitation: str
    partial_coverage: str
    decimal_separator: str
