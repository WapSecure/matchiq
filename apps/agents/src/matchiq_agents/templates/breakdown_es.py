from typing import Final

from matchiq_agents.contracts.types import InsightKind, MinutePhase, ScoreState, TrendDirection
from matchiq_agents.templates.breakdown_book import BreakdownBook

K, P, S, T = InsightKind, MinutePhase, ScoreState, TrendDirection

# Spanish number words double as ordinary words ("once", "ten"); the phrases avoid them.
ES_ES_BREAKDOWN: Final = BreakdownBook(
    regain="{subject} había recuperado el balón {seconds} segundos antes del gol.",
    score={
        S.LEADING: "{subject} gana por {margin} en el minuto {minute}",
        S.LEVEL: "El marcador está igualado en el minuto {minute}",
        S.TRAILING: "{subject} pierde por {margin} en el minuto {minute}",
    },
    phases={
        P.EARLY: ", en el arranque del partido",
        P.FIRST_HALF: "",
        P.BEFORE_HALF_TIME: ", justo antes del descanso",
        P.SECOND_HALF: "",
        P.FINAL_15: ", en el tramo final",
    },
    compare=(
        "En los últimos {window} minutos, {subject} suma {recent} {label}, frente a una media "
        "de {average} en el partido para un tramo de esa duración"
    ),
    compare_opponent="; {opponent} suma {other}",
    trend={
        T.RISING: "{subject} va a más tramo a tramo: {a}, {b} y luego {c} {label}.",
        T.FALLING: "{subject} ha ido a menos tramo a tramo: {a}, {b} y luego {c} {label}.",
    },
    previous={
        K.GOAL: "{subject} ya había marcado en el minuto {minute}.",
        K.RED_CARD: "{subject} ya se había quedado con un jugador menos en el minuto {minute}.",
        K.SHOT_BURST: "{subject} ya tuvo una racha de tiros parecida en el minuto {minute}.",
        K.HIGH_REGAINS: "{subject} ya recuperó el balón arriba en el minuto {minute}.",
        K.PRESSURE_SWING: "{subject} ya tuvo una fase de presión parecida en el minuto {minute}.",
        K.MOMENTUM_SHIFT: "{subject} ya tuvo una fase de dominio parecida en el minuto {minute}.",
        K.PLAYER_MILESTONE: "{subject} ya había vivido un momento parecido en el minuto {minute}.",
    },
    why_plain={
        K.GOAL: "El gol cambia el guion del partido.",
        K.RED_CARD: "Jugar con un futbolista menos puede cambiar cómo se disputa el partido.",
        K.SHOT_BURST: "La presión ofensiva parece concentrarse en esta fase.",
        K.HIGH_REGAINS: "La presión territorial parece ir en aumento.",
        K.PRESSURE_SWING: "El equilibrio de la presión parece estar cambiando.",
        K.MOMENTUM_SHIFT: "El impulso parece estar pasando de un equipo a otro.",
        K.PLAYER_MILESTONE: "La cifra refleja una participación constante.",
    },
    watch={
        K.GOAL: "Habrá que ver cómo responde el partido al gol.",
        K.RED_CARD: "Habrá que ver cómo se reorganiza {subject} con un jugador menos.",
        K.SHOT_BURST: "Habrá que ver si {subject} convierte esta presión en ocasiones más claras.",
        K.HIGH_REGAINS: "Habrá que ver si {subject} sigue recuperando el balón tan arriba.",
        K.PRESSURE_SWING: "Habrá que ver si {subject} puede mantener esta presión.",
        K.MOMENTUM_SHIFT: "Habrá que ver si {subject} aprovecha este buen momento.",
        K.PLAYER_MILESTONE: "Habrá que ver cuánto más participa {subject}.",
    },
    watch_goal={
        S.LEADING: "Habrá que ver si {subject} puede defender la ventaja.",
        S.LEVEL: "Habrá que ver si {subject} puede seguir creciendo tras el empate.",
        S.TRAILING: "Habrá que ver si {subject} puede seguir apretando en busca del empate.",
    },
)
