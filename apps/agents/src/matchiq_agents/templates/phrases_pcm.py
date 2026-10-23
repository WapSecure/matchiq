"""Nigerian Pidgin (Naijá) phrases in BBC Pidgin spelling ("di", "dey", "don").

Football terms stay in English as Nigerian fans say them. See
docs/localization/PIDGIN_GLOSSARY.md, which is pending native-speaker review.
"""

from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.domain.story import GoalState, Window
from matchiq_agents.templates.phrasebook import GoalPhrases, Phrasebook, RedCardPhrases

K = InsightKind
G = GoalState

PCM_NG: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} don score", "{subject} don find di net"),
        K.RED_CARD: ("Red card for {subject}", "{subject} don lose one player to red card"),
        K.SHOT_BURST: ("{subject} dey rain shots", "{subject} dey fire shots back to back"),
        K.HIGH_REGAINS: ("{subject} dey win ball for up", "{subject} dey press well well"),
        K.PRESSURE_SWING: (
            "{subject} don raise di pressure",
            "Di pressure don turn go {subject} side",
        ),
        K.MOMENTUM_SHIFT: (
            "{subject} don hold di momentum",
            "Momentum don shift go {subject} side",
        ),
        K.PLAYER_MILESTONE: ("{subject} don reach milestone", "Milestone for {subject}"),
    },
    shorts={
        K.GOAL: "GOAL — {subject}",
        K.RED_CARD: "Red card: {subject}",
        K.SHOT_BURST: "Shots: {subject}",
        K.HIGH_REGAINS: "High press: {subject}",
        K.PRESSURE_SWING: "Pressure: {subject}",
        K.MOMENTUM_SHIFT: "Momentum: {subject}",
        K.PLAYER_MILESTONE: "Milestone: {subject}",
    },
    plain={
        K.GOAL: ("{subject} don score.", "Goal for {subject}."),
        K.RED_CARD: ("{subject} don lose one player to red card.", "Red card for {subject}."),
        K.SHOT_BURST: (
            "{subject} dey rain shots for dis spell.",
            "{subject} dey fire shots back to back.",
        ),
        K.HIGH_REGAINS: (
            "{subject} dey win di ball back for up again and again.",
            "{subject} dey collect ball for up.",
        ),
        K.PRESSURE_SWING: (
            "{subject} dey press well well for dis spell.",
            "{subject} don raise di pressure.",
        ),
        K.MOMENTUM_SHIFT: ("Di game dey turn go {subject} side.", "{subject} dey on top."),
        K.PLAYER_MILESTONE: (
            "{subject} don reach milestone for dis match.",
            "Milestone for {subject}.",
        ),
    },
    generic_subject="di team",
    fact="{subject} don get {value} {label} {window}.",
    fact_player="{subject} don get {value} {label} {window}.",
    caption="Na {value} {label} for {subject} {window}.",
    rise="{subject} don get {value} {label} {window}, e pass {before} {previous}.",
    windows={
        Window.CURRENT: "recently",
        Window.PREVIOUS: "for di spell before",
        Window.TOTAL: "for dis match",
    },
    goal=GoalPhrases(
        headlines={
            G.LEAD: "GOAL — {team} dey lead {s}\u2013{o}",
            G.LEVEL: "GOAL — {team} don equalise, {s}\u2013{o}",
            G.TRAIL: "GOAL — {team} don pull one back, {s}\u2013{o}",
        },
        headline_unscored="GOAL — {team} don score",
        scorer="{player} don score for {team}",
        scorer_unnamed="{team} don score",
        states={
            G.LEAD: ", and dem dey lead {s}\u2013{o} now",
            G.LEVEL: ", and e don level for {s}\u2013{o}",
            G.TRAIL: ", but dem still dey behind {s}\u2013{o}",
        },
        scoreboard="{scorer}: {home} {h}\u2013{a} {away}.",
    ),
    red_card=RedCardPhrases(
        casual="{player} don collect red card for {team}.",
        casual_unnamed="{team} don lose one player to red card.",
        caption="Red card for {player} of {team}.",
        caption_unnamed="Red card for {team}.",
    ),
    index_pair="{label} (na description, no be prediction): {subject} {value}, {other} {before}.",
    index_single="{label} (na description, no be prediction): {subject} {value}.",
    confidence="Confidence na {label}.",
    confidence_labels={
        ConfidenceLabel.low: "low",
        ConfidenceLabel.medium: "medium",
        ConfidenceLabel.high: "high",
    },
    counter_note="Some events for dis window dey show di opposite too.",
    limitation="Na synthetic event feed; no tracking data.",
    partial_coverage="Some event types wey we expect no dey dis window.",
    decimal_separator=".",
)
