from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.templates.phrasebook import Phrasebook

K = InsightKind

ES_ES: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} marca", "Gol de {subject}"),
        K.RED_CARD: ("Tarjeta roja para {subject}", "{subject} pierde a un jugador por roja"),
        K.SHOT_BURST: ("{subject} acumula disparos", "{subject} lanza una ráfaga de tiros"),
        K.HIGH_REGAINS: ("{subject} aprieta arriba", "{subject} recupera el balón en campo rival"),
        K.PRESSURE_SWING: (
            "{subject} toma el control de la presión",
            "La presión se inclina hacia {subject}",
        ),
        K.MOMENTUM_SHIFT: ("{subject} toma el impulso", "El impulso pasa a {subject}"),
        K.PLAYER_MILESTONE: ("{subject} alcanza un hito", "Un hito para {subject}"),
    },
    shorts={
        K.GOAL: "Gol",
        K.RED_CARD: "Tarjeta roja",
        K.SHOT_BURST: "Lluvia de disparos",
        K.HIGH_REGAINS: "Crece la presión",
        K.PRESSURE_SWING: "Cambio en la presión",
        K.MOMENTUM_SHIFT: "Cambio de impulso",
        K.PLAYER_MILESTONE: "Hito alcanzado",
    },
    generic_subject="El equipo",
    with_value="{lead}, con {value} {label}.",
    qualitative="{lead} en este tramo.",
    metrics_title="Métricas del motor",
    confidence_title="Confianza",
    confidence_labels={
        ConfidenceLabel.low: "baja",
        ConfidenceLabel.medium: "media",
        ConfidenceLabel.high: "alta",
    },
    counter_note="También se registraron indicios en sentido contrario en este tramo.",
    limitation="Flujo de eventos sintético; sin datos de seguimiento.",
    partial_coverage="Faltan algunos tipos de eventos esperados en este tramo.",
    sides={"home": "local", "away": "visitante"},
    decimal_separator=",",
)
