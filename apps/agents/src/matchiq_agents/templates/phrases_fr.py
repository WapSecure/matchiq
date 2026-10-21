from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.templates.phrasebook import Phrasebook

K = InsightKind

FR_FR: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} trouve le chemin des filets", "But pour {subject}"),
        K.RED_CARD: ("Carton rouge pour {subject}", "{subject} perd un joueur sur carton rouge"),
        K.SHOT_BURST: ("{subject} multiplie les tirs", "{subject} enchaîne les frappes"),
        K.HIGH_REGAINS: ("{subject} met la pression", "{subject} récupère le ballon haut"),
        K.PRESSURE_SWING: (
            "{subject} prend le contrôle du pressing",
            "Le pressing bascule vers {subject}",
        ),
        K.MOMENTUM_SHIFT: ("{subject} prend l'ascendant", "L'élan passe du côté de {subject}"),
        K.PLAYER_MILESTONE: ("{subject} franchit un cap", "Un cap franchi pour {subject}"),
    },
    shorts={
        K.GOAL: "But",
        K.RED_CARD: "Carton rouge",
        K.SHOT_BURST: "Pluie de tirs",
        K.HIGH_REGAINS: "La pression monte",
        K.PRESSURE_SWING: "Bascule du pressing",
        K.MOMENTUM_SHIFT: "Changement de dynamique",
        K.PLAYER_MILESTONE: "Cap franchi",
    },
    generic_subject="L'équipe",
    with_value="{lead}, avec {value} {label}.",
    qualitative="{lead} sur cette séquence.",
    metrics_title="Statistiques du moteur",
    confidence_title="Confiance",
    confidence_labels={
        ConfidenceLabel.low: "faible",
        ConfidenceLabel.medium: "moyenne",
        ConfidenceLabel.high: "élevée",
    },
    counter_note="Des éléments contraires ont aussi été relevés sur la période.",
    limitation="Flux d'événements synthétique ; pas de données de suivi.",
    partial_coverage="Certains types d'événements attendus manquent sur cette période.",
    sides={"home": "domicile", "away": "extérieur"},
    decimal_separator=",",
)
