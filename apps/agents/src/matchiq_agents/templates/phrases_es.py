from typing import Final

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind
from matchiq_agents.domain.story import GoalState, Window
from matchiq_agents.templates.phrasebook import GoalPhrases, Phrasebook, RedCardPhrases

K = InsightKind
G = GoalState

ES_ES: Final = Phrasebook(
    leads={
        K.GOAL: ("{subject} marca", "Gol de {subject}"),
        K.RED_CARD: ("Tarjeta roja para {subject}", "{subject} pierde a un jugador por roja"),
        K.SHOT_BURST: ("{subject} acumula disparos", "{subject} lanza una ráfaga de tiros"),
        K.HIGH_REGAINS: ("{subject} aprieta arriba", "{subject} recupera el balón arriba"),
        K.PRESSURE_SWING: (
            "{subject} sube la presión",
            "La presión se inclina hacia {subject}",
        ),
        K.MOMENTUM_SHIFT: ("{subject} toma el impulso", "El impulso pasa a {subject}"),
        K.PLAYER_MILESTONE: ("{subject} alcanza un hito", "Un hito para {subject}"),
    },
    shorts={
        K.GOAL: "GOL — {subject}",
        K.RED_CARD: "Roja: {subject}",
        K.SHOT_BURST: "Tiros: {subject}",
        K.HIGH_REGAINS: "Presión alta: {subject}",
        K.PRESSURE_SWING: "Presión: {subject}",
        K.MOMENTUM_SHIFT: "Impulso: {subject}",
        K.PLAYER_MILESTONE: "Hito: {subject}",
    },
    plain={
        K.GOAL: ("{subject} marca.", "Gol de {subject}."),
        K.RED_CARD: ("{subject} se queda con un jugador menos.", "Tarjeta roja para {subject}."),
        K.SHOT_BURST: (
            "{subject} acumula disparos en este tramo.",
            "{subject} no deja de disparar.",
        ),
        K.HIGH_REGAINS: (
            "{subject} recupera el balón arriba sin parar.",
            "{subject} roba arriba.",
        ),
        K.PRESSURE_SWING: (
            "{subject} presiona más fuerte en este tramo.",
            "{subject} aprieta en la presión.",
        ),
        K.MOMENTUM_SHIFT: ("El partido se inclina hacia {subject}.", "{subject} manda."),
        K.PLAYER_MILESTONE: (
            "{subject} alcanza un hito en este partido.",
            "Un hito para {subject}.",
        ),
    },
    generic_subject="el equipo",
    fact="{subject} suma {value} {label} {window}.",
    fact_player="{subject} suma {value} {label} {window}.",
    caption="{value} {label} para {subject} {window}.",
    rise="{subject} suma {value} {label} {window}, frente a {before} {previous}.",
    windows={
        Window.CURRENT: "recientemente",
        Window.PREVIOUS: "en el tramo anterior",
        Window.TOTAL: "en el partido",
    },
    goal=GoalPhrases(
        headlines={
            G.LEAD: "GOL — {team} gana {s}\u2013{o}",
            G.LEVEL: "GOL — {team} empata a {s}\u2013{o}",
            G.TRAIL: "GOL — {team} recorta distancias, {s}\u2013{o}",
        },
        headline_unscored="GOL — {team} marca",
        scorer="{player} marca para {team}",
        scorer_unnamed="{team} marca",
        states={
            G.LEAD: ", que gana {s}\u2013{o}",
            G.LEVEL: ", y el marcador queda igualado a {s}\u2013{o}",
            G.TRAIL: ", que aún pierde {s}\u2013{o}",
        },
        scoreboard="{scorer}: {home} {h}\u2013{a} {away}.",
    ),
    red_card=RedCardPhrases(
        casual="{player} es expulsado y {team} se queda con un jugador menos.",
        casual_unnamed="{team} se queda con un jugador menos.",
        caption="Roja para {player} ({team}).",
        caption_unnamed="Tarjeta roja para {team}.",
    ),
    index_pair=(
        "{label} (escala descriptiva, no un pronóstico): {subject} {value}, {other} {before}."
    ),
    index_single="{label} (escala descriptiva, no un pronóstico): {subject} {value}.",
    confidence="La confianza es {label}.",
    confidence_labels={
        ConfidenceLabel.low: "baja",
        ConfidenceLabel.medium: "media",
        ConfidenceLabel.high: "alta",
    },
    counter_note="También se registraron indicios en sentido contrario en el periodo.",
    limitation="Flujo de eventos sintético; sin datos de seguimiento.",
    partial_coverage="Faltan algunos tipos de eventos esperados en este periodo.",
    decimal_separator=",",
)
