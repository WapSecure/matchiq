from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.domain.story import GoalState, Window
from matchiq_agents.templates.phrasebook import GoalPhrases, Phrasebook, RedCardPhrases

K = InsightKind
G = GoalState

FR_FR: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} marque", "But pour {subject}"),
        K.RED_CARD: ("Carton rouge pour {subject}", "{subject} perd un joueur sur carton rouge"),
        K.SHOT_BURST: ("{subject} multiplie les tirs", "{subject} enchaîne les frappes"),
        K.HIGH_REGAINS: ("{subject} récupère le ballon haut", "{subject} presse haut"),
        K.PRESSURE_SWING: (
            "{subject} accentue le pressing",
            "Le pressing bascule vers {subject}",
        ),
        K.MOMENTUM_SHIFT: ("{subject} prend l'ascendant", "L'élan passe du côté de {subject}"),
        K.PLAYER_MILESTONE: ("{subject} franchit un cap", "Un cap franchi pour {subject}"),
    },
    shorts={
        K.GOAL: "BUT — {subject}",
        K.RED_CARD: "Carton rouge : {subject}",
        K.SHOT_BURST: "Tirs : {subject}",
        K.HIGH_REGAINS: "Pressing haut : {subject}",
        K.PRESSURE_SWING: "Pressing : {subject}",
        K.MOMENTUM_SHIFT: "Dynamique : {subject}",
        K.PLAYER_MILESTONE: "Cap franchi : {subject}",
    },
    plain={
        K.GOAL: ("{subject} marque.", "But pour {subject}."),
        K.RED_CARD: ("{subject} perd un joueur sur carton rouge.", "Carton rouge pour {subject}."),
        K.SHOT_BURST: (
            "{subject} multiplie les tirs sur cette séquence.",
            "{subject} enchaîne les frappes.",
        ),
        K.HIGH_REGAINS: (
            "{subject} récupère sans cesse le ballon haut.",
            "{subject} gagne le ballon haut.",
        ),
        K.PRESSURE_SWING: (
            "{subject} presse plus fort sur cette séquence.",
            "{subject} accentue le pressing.",
        ),
        K.MOMENTUM_SHIFT: ("Le match bascule en faveur de {subject}.", "{subject} domine."),
        K.PLAYER_MILESTONE: (
            "{subject} franchit un cap dans ce match.",
            "Un cap franchi pour {subject}.",
        ),
    },
    generic_subject="l'équipe",
    fact="{subject} compte {value} {label} {window}.",
    fact_player="{subject} compte {value} {label} {window}.",
    caption="{value} {label} pour {subject} {window}.",
    rise="{subject} compte {value} {label} {window}, contre {before} {previous}.",
    windows={
        Window.CURRENT: "récemment",
        Window.PREVIOUS: "sur la séquence précédente",
        Window.TOTAL: "sur le match",
    },
    goal=GoalPhrases(
        headlines={
            G.LEAD: "BUT — {team} mène {s}\u2013{o}",
            G.LEVEL: "BUT — {team} égalise à {s}\u2013{o}",
            G.TRAIL: "BUT — {team} réduit l'écart à {s}\u2013{o}",
        },
        headline_unscored="BUT — {team} marque",
        scorer="{player} marque pour {team}",
        scorer_unnamed="{team} marque",
        states={
            G.LEAD: ", qui mène {s}\u2013{o}",
            G.LEVEL: ", et c'est l'égalité à {s}\u2013{o}",
            G.TRAIL: ", qui reste menée {s}\u2013{o}",
        },
        scoreboard="{scorer} : {home} {h}\u2013{a} {away}.",
    ),
    red_card=RedCardPhrases(
        casual="{player} est expulsé, et {team} perd un joueur.",
        casual_unnamed="{team} perd un joueur sur carton rouge.",
        caption="Carton rouge pour {player} ({team}).",
        caption_unnamed="Carton rouge pour {team}.",
    ),
    index_pair=(
        "{label} (échelle descriptive, pas une prévision) : {subject} {value}, {other} {before}."
    ),
    index_single="{label} (échelle descriptive, pas une prévision) : {subject} {value}.",
    confidence="La confiance est {label}.",
    confidence_labels={
        ConfidenceLabel.low: "faible",
        ConfidenceLabel.medium: "moyenne",
        ConfidenceLabel.high: "élevée",
    },
    counter_note="Des éléments contraires ont aussi été relevés sur la période.",
    limitation="Flux d'événements synthétique ; pas de données de suivi.",
    partial_coverage="Certains types d'événements attendus manquent sur cette période.",
    decimal_separator=",",
)
