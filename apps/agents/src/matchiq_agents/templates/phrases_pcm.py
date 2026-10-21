"""Nigerian Pidgin (Naijá) phrases in BBC Pidgin spelling ("di", "dey", "don").

Football terms stay in English as Nigerian fans say them. See
docs/localization/PIDGIN_GLOSSARY.md, which is pending native-speaker review.
"""

from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.templates.phrasebook import Phrasebook

K = InsightKind

PCM_NG: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} don score", "{subject} don find di net"),
        K.RED_CARD: ("Red card for {subject}", "{subject} don lose one player to red card"),
        K.SHOT_BURST: ("{subject} dey rain shots", "{subject} dey fire shots back to back"),
        K.HIGH_REGAINS: ("{subject} dey press well well", "{subject} dey win ball for up"),
        K.PRESSURE_SWING: (
            "{subject} don take control of di pressure",
            "Di pressure don turn go {subject} side",
        ),
        K.MOMENTUM_SHIFT: (
            "{subject} don hold di momentum",
            "Momentum don shift go {subject} side",
        ),
        K.PLAYER_MILESTONE: ("{subject} don reach milestone", "Milestone for {subject}"),
    },
    shorts={
        K.GOAL: "Goal",
        K.RED_CARD: "Red card",
        K.SHOT_BURST: "Shots dey rain",
        K.HIGH_REGAINS: "Pressure dey build",
        K.PRESSURE_SWING: "Pressure don swing",
        K.MOMENTUM_SHIFT: "Momentum don shift",
        K.PLAYER_MILESTONE: "Player milestone",
    },
    generic_subject="Di team",
    with_value="{lead}, with {value} {label}.",
    qualitative="{lead} for dis spell.",
    metrics_title="Engine numbers",
    confidence_title="Confidence",
    confidence_labels={
        ConfidenceLabel.low: "low",
        ConfidenceLabel.medium: "medium",
        ConfidenceLabel.high: "high",
    },
    counter_note="Some events for dis window dey show di opposite too.",
    limitation="Na synthetic event feed; no tracking data.",
    partial_coverage="Some event types wey we expect no dey dis window.",
    sides={"home": "home", "away": "away"},
    decimal_separator=".",
)
