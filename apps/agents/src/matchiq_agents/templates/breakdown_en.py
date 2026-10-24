from typing import Final

from matchiq_agents.contracts.types import InsightKind, MinutePhase, ScoreState, TrendDirection
from matchiq_agents.templates.breakdown_book import BreakdownBook
from matchiq_agents.templates.phrases_en import INFERENCES

K, P, S, T = InsightKind, MinutePhase, ScoreState, TrendDirection

EN_GB_BREAKDOWN: Final = BreakdownBook(
    regain="{subject} had won the ball back {seconds} seconds before the goal.",
    score={
        S.LEADING: "{subject} lead by {margin} in minute {minute}",
        S.LEVEL: "The scores are level in minute {minute}",
        S.TRAILING: "{subject} trail by {margin} in minute {minute}",
    },
    phases={
        P.EARLY: ", early in the match",
        P.FIRST_HALF: "",
        P.BEFORE_HALF_TIME: ", just before half-time",
        P.SECOND_HALF: "",
        P.FINAL_15: ", in the closing stages",
    },
    compare=(
        "In the last {window} minutes {subject} have {recent} {label}, against a match "
        "average of {average} for a spell that long"
    ),
    compare_opponent="; {opponent} have {other}",
    trend={
        T.RISING: "{subject} have built up spell by spell: {a}, {b}, then {c} {label}.",
        T.FALLING: "{subject} have eased off spell by spell: {a}, {b}, then {c} {label}.",
    },
    previous={
        K.GOAL: "{subject} had also scored in minute {minute}.",
        K.RED_CARD: "{subject} had also had a player sent off in minute {minute}.",
        K.SHOT_BURST: "{subject} had a similar burst of shots in minute {minute}.",
        K.HIGH_REGAINS: "{subject} had a similar spell of high regains in minute {minute}.",
        K.PRESSURE_SWING: "{subject} had a similar pressing spell in minute {minute}.",
        K.MOMENTUM_SHIFT: "{subject} had a similar spell on top in minute {minute}.",
        K.PLAYER_MILESTONE: "{subject} had a similar landmark moment in minute {minute}.",
    },
    why_plain=INFERENCES,
    watch={
        K.GOAL: "Watch how the match responds to the goal.",
        K.RED_CARD: "Watch how {subject} reorganise with a player fewer.",
        K.SHOT_BURST: "Watch whether {subject} can turn this pressure into clearer chances.",
        K.HIGH_REGAINS: "Watch whether {subject} can keep winning the ball this high up the pitch.",
        K.PRESSURE_SWING: "Watch whether {subject} can keep this pressure up.",
        K.MOMENTUM_SHIFT: "Watch whether {subject} can make this spell count.",
        K.PLAYER_MILESTONE: "Watch how much more {subject} gets involved.",
    },
    watch_goal={
        S.LEADING: "Watch whether {subject} can protect the lead.",
        S.LEVEL: "Watch whether {subject} can push on from the equaliser.",
        S.TRAILING: "Watch whether {subject} can keep pushing for an equaliser.",
    },
)
