from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.templates.phrasebook import Phrasebook

K = InsightKind

EN_GB: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} find the net", "{subject} score"),
        K.RED_CARD: ("Red card for {subject}", "{subject} lose a player to a red card"),
        K.SHOT_BURST: ("{subject} pile on the shots", "{subject} fire in a burst of shots"),
        K.HIGH_REGAINS: ("{subject} turn up the pressure", "{subject} win the ball back high"),
        K.PRESSURE_SWING: (
            "{subject} take control of the pressure",
            "The pressure swings towards {subject}",
        ),
        K.MOMENTUM_SHIFT: ("{subject} seize the momentum", "Momentum shifts to {subject}"),
        K.PLAYER_MILESTONE: ("{subject} reaches a milestone", "A milestone for {subject}"),
    },
    shorts={
        K.GOAL: "Goal",
        K.RED_CARD: "Red card",
        K.SHOT_BURST: "Shots raining in",
        K.HIGH_REGAINS: "Pressure building",
        K.PRESSURE_SWING: "Pressure swing",
        K.MOMENTUM_SHIFT: "Momentum shift",
        K.PLAYER_MILESTONE: "Player milestone",
    },
    generic_subject="The team",
    with_value="{lead}, with {value} {label}.",
    qualitative="{lead} in this spell.",
    metrics_title="Engine metrics",
    confidence_title="Confidence",
    confidence_labels={
        ConfidenceLabel.low: "low",
        ConfidenceLabel.medium: "medium",
        ConfidenceLabel.high: "high",
    },
    counter_note="Counter-evidence was also recorded in the window.",
    limitation="Synthetic event feed; no tracking data.",
    partial_coverage="Some expected event types are missing from this window.",
    sides={"home": "home", "away": "away"},
    decimal_separator=".",
)

INFERENCES: Final[dict[InsightKind, str]] = {
    K.GOAL: "The goal changes the state of the match.",
    K.RED_CARD: "Playing a player short may change how the match is contested.",
    K.SHOT_BURST: "Attacking pressure appears to be concentrated in this spell.",
    K.HIGH_REGAINS: "Territorial pressure may be increasing.",
    K.PRESSURE_SWING: "The balance of pressure may be shifting.",
    K.MOMENTUM_SHIFT: "Momentum may be moving between the sides.",
    K.PLAYER_MILESTONE: "The milestone reflects sustained involvement.",
}
