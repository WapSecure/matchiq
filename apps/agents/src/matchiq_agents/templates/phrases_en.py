from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.domain.story import GoalState, Window
from matchiq_agents.templates.phrasebook import GoalPhrases, Phrasebook, RedCardPhrases

K = InsightKind
G = GoalState

EN_GB: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} score", "Goal for {subject}"),
        K.RED_CARD: ("Red card for {subject}", "{subject} lose a player to a red card"),
        K.SHOT_BURST: ("{subject} pile on the shots", "{subject} fire in a burst of shots"),
        K.HIGH_REGAINS: ("{subject} win the ball back high", "{subject} press high and win it"),
        K.PRESSURE_SWING: (
            "{subject} turn up the pressure",
            "The pressure swings towards {subject}",
        ),
        K.MOMENTUM_SHIFT: ("{subject} seize the momentum", "Momentum swings to {subject}"),
        K.PLAYER_MILESTONE: ("{subject} reaches a milestone", "A milestone for {subject}"),
    },
    shorts={
        K.GOAL: "GOAL — {subject}",
        K.RED_CARD: "Red card: {subject}",
        K.SHOT_BURST: "Shots: {subject}",
        K.HIGH_REGAINS: "High press: {subject}",
        K.PRESSURE_SWING: "Pressing: {subject}",
        K.MOMENTUM_SHIFT: "Momentum: {subject}",
        K.PLAYER_MILESTONE: "Milestone: {subject}",
    },
    plain={
        K.GOAL: ("{subject} score.", "Goal for {subject}."),
        K.RED_CARD: ("{subject} have a player sent off.", "Red card for {subject}."),
        K.SHOT_BURST: (
            "{subject} pile on the shots in this spell.",
            "{subject} are piling on the shots.",
        ),
        K.HIGH_REGAINS: (
            "{subject} keep winning the ball back high up the pitch.",
            "{subject} are winning the ball back high.",
        ),
        K.PRESSURE_SWING: (
            "{subject} are pressing harder in this spell.",
            "{subject} turn up the pressure.",
        ),
        K.MOMENTUM_SHIFT: ("The game is swinging towards {subject}.", "{subject} are on top."),
        K.PLAYER_MILESTONE: (
            "{subject} reaches a milestone in this match.",
            "A milestone for {subject}.",
        ),
    },
    generic_subject="the team",
    fact="{subject} have {value} {label} {window}.",
    fact_player="{subject} has {value} {label} {window}.",
    caption="{value} {label} for {subject} {window}.",
    rise="{subject} have {value} {label} {window}, up from {before} {previous}.",
    windows={
        Window.CURRENT: "recently",
        Window.PREVIOUS: "in the previous spell",
        Window.TOTAL: "in the match",
    },
    goal=GoalPhrases(
        headlines={
            G.LEAD: "GOAL — {team} lead {s}\u2013{o}",
            G.LEVEL: "GOAL — {team} equalise at {s}\u2013{o}",
            G.TRAIL: "GOAL — {team} pull one back at {s}\u2013{o}",
        },
        headline_unscored="GOAL — {team} score",
        scorer="{player} scores for {team}",
        scorer_unnamed="{team} score",
        states={
            G.LEAD: ", and they lead {s}\u2013{o}",
            G.LEVEL: ", and it is level at {s}\u2013{o}",
            G.TRAIL: ", but they still trail {s}\u2013{o}",
        },
        scoreboard="{scorer}: {home} {h}\u2013{a} {away}.",
    ),
    red_card=RedCardPhrases(
        casual="{player} is sent off for {team}.",
        casual_unnamed="{team} have a player sent off.",
        caption="Red card for {player} of {team}.",
        caption_unnamed="{team} lose a player to a red card.",
    ),
    index_pair=(
        "{label} (a descriptive scale, not a forecast): {subject} {value}, {other} {before}."
    ),
    index_single="{label} (a descriptive scale, not a forecast): {subject} {value}.",
    confidence="Confidence is {label}.",
    confidence_labels={
        ConfidenceLabel.low: "low",
        ConfidenceLabel.medium: "medium",
        ConfidenceLabel.high: "high",
    },
    counter_note="Counter-evidence was also recorded in the window.",
    limitation="Synthetic event feed; no tracking data.",
    partial_coverage="Some expected event types are missing from this window.",
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
