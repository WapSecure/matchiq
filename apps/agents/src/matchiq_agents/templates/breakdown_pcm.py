"""Nigerian Pidgin breakdown phrases, in the BBC Pidgin spelling of `phrases_pcm.py`."""

from typing import Final

from matchiq_agents.contracts.types import InsightKind, MinutePhase, ScoreState, TrendDirection
from matchiq_agents.templates.breakdown_book import BreakdownBook

K, P, S, T = InsightKind, MinutePhase, ScoreState, TrendDirection

PCM_NG_BREAKDOWN: Final = BreakdownBook(
    regain="{subject} don win di ball back {seconds} seconds before di goal.",
    score={
        S.LEADING: "{subject} dey lead by {margin} for minute {minute}",
        S.LEVEL: "Di score dey level for minute {minute}",
        S.TRAILING: "{subject} dey behind by {margin} for minute {minute}",
    },
    phases={
        P.EARLY: ", early for di match",
        P.FIRST_HALF: "",
        P.BEFORE_HALF_TIME: ", just before half-time",
        P.SECOND_HALF: "",
        P.FINAL_15: ", as di match dey end",
    },
    compare=(
        "For di last {window} minutes, {subject} don get {recent} {label}, and di match average "
        "for spell like dat na {average}"
    ),
    compare_opponent="; {opponent} don get {other}",
    trend={
        T.RISING: "{subject} dey build am up spell by spell: {a}, {b}, then {c} {label}.",
        T.FALLING: "{subject} don cool off spell by spell: {a}, {b}, then {c} {label}.",
    },
    previous={
        K.GOAL: "{subject} don score before for minute {minute}.",
        K.RED_CARD: "{subject} don lose player to red card before for minute {minute}.",
        K.SHOT_BURST: "{subject} get dis kind shots spell before for minute {minute}.",
        K.HIGH_REGAINS: "{subject} win ball for up like dis before for minute {minute}.",
        K.PRESSURE_SWING: "{subject} press like dis before for minute {minute}.",
        K.MOMENTUM_SHIFT: "{subject} dey on top like dis before for minute {minute}.",
        K.PLAYER_MILESTONE: "{subject} get dis kind moment before for minute {minute}.",
    },
    why_plain={
        K.GOAL: "Dis goal don change how di match dey go.",
        K.RED_CARD: "To play with one player short fit change how di match go be.",
        K.SHOT_BURST: "E be like say di attack dey concentrate for dis spell.",
        K.HIGH_REGAINS: "E be like say di territorial pressure dey increase.",
        K.PRESSURE_SWING: "E be like say di balance of pressure dey shift.",
        K.MOMENTUM_SHIFT: "E be like say di momentum dey change side.",
        K.PLAYER_MILESTONE: "Dis milestone show say di player dey involved well well.",
    },
    watch={
        K.GOAL: "Make we see how di match go respond to dis goal.",
        K.RED_CARD: "Make we see how {subject} go arrange demself with one player short.",
        K.SHOT_BURST: "Make we see whether {subject} fit turn dis pressure to better chances.",
        K.HIGH_REGAINS: "Make we see whether {subject} fit keep winning di ball for up like dis.",
        K.PRESSURE_SWING: "Make we see whether {subject} fit keep dis pressure.",
        K.MOMENTUM_SHIFT: "Make we see whether {subject} fit use dis spell well.",
        K.PLAYER_MILESTONE: "Make we see how much more {subject} go involve for di game.",
    },
    watch_goal={
        S.LEADING: "Make we see whether {subject} fit hold di lead.",
        S.LEVEL: "Make we see whether {subject} fit push on after di equaliser.",
        S.TRAILING: "Make we see whether {subject} fit keep pushing for equaliser.",
    },
)
