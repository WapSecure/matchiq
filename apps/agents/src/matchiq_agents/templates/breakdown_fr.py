from typing import Final

from matchiq_agents.contracts.types import InsightKind, MinutePhase, ScoreState, TrendDirection
from matchiq_agents.templates.breakdown_book import BreakdownBook

K, P, S, T = InsightKind, MinutePhase, ScoreState, TrendDirection

# "retard" (behind) is avoided: the safety blocklist reads it as an English slur.
FR_FR_BREAKDOWN: Final = BreakdownBook(
    regain="{subject} avait récupéré le ballon {seconds} secondes avant le but.",
    score={
        S.LEADING: "{subject} mène de {margin} à la minute {minute}",
        S.LEVEL: "C'est l'égalité au score à la minute {minute}",
        S.TRAILING: "{subject} doit remonter un écart de {margin} à la minute {minute}",
    },
    phases={
        P.EARLY: ", en début de match",
        P.FIRST_HALF: "",
        P.BEFORE_HALF_TIME: ", juste avant la pause",
        P.SECOND_HALF: "",
        P.FINAL_15: ", en fin de match",
    },
    compare=(
        "Sur les {window} dernières minutes, {subject} compte {recent} {label}, pour une "
        "moyenne de {average} sur une période aussi longue dans ce match"
    ),
    compare_opponent=" ; {opponent} en compte {other}",
    trend={
        T.RISING: "{subject} monte en puissance séquence après séquence : {a}, {b}, puis {c} "
        "{label}.",
        T.FALLING: "{subject} lève le pied séquence après séquence : {a}, {b}, puis {c} {label}.",
    },
    previous={
        K.GOAL: "{subject} avait déjà marqué à la minute {minute}.",
        K.RED_CARD: "{subject} avait déjà perdu un joueur sur carton rouge à la minute {minute}.",
        K.SHOT_BURST: "{subject} avait déjà connu une rafale de tirs à la minute {minute}.",
        K.HIGH_REGAINS: "{subject} avait déjà récupéré le ballon haut à la minute {minute}.",
        K.PRESSURE_SWING: "{subject} avait déjà connu un temps fort au pressing à la minute "
        "{minute}.",
        K.MOMENTUM_SHIFT: "{subject} avait déjà pris l'ascendant à la minute {minute}.",
        K.PLAYER_MILESTONE: "{subject} avait déjà franchi un cap à la minute {minute}.",
    },
    why_plain={
        K.GOAL: "Le but change la physionomie du match.",
        K.RED_CARD: "Jouer en infériorité numérique peut changer la façon dont le match se "
        "dispute.",
        K.SHOT_BURST: "La pression offensive semble se concentrer sur cette séquence.",
        K.HIGH_REGAINS: "La pression territoriale semble s'accentuer.",
        K.PRESSURE_SWING: "L'équilibre du pressing semble basculer.",
        K.MOMENTUM_SHIFT: "La dynamique semble passer d'une équipe à l'autre.",
        K.PLAYER_MILESTONE: "Ce cap reflète une implication constante.",
    },
    watch={
        K.GOAL: "Reste à voir comment le match réagit à ce but.",
        K.RED_CARD: "Reste à voir comment {subject} se réorganise en infériorité numérique.",
        K.SHOT_BURST: "Reste à voir si {subject} parvient à transformer cette pression en "
        "occasions plus nettes.",
        K.HIGH_REGAINS: "Reste à voir si {subject} parvient à récupérer le ballon aussi haut.",
        K.PRESSURE_SWING: "Reste à voir si {subject} parvient à maintenir ce pressing.",
        K.MOMENTUM_SHIFT: "Reste à voir si {subject} parvient à concrétiser ce temps fort.",
        K.PLAYER_MILESTONE: "Reste à voir jusqu'où {subject} pèse sur le match.",
    },
    watch_goal={
        S.LEADING: "Reste à voir si {subject} parvient à conserver son avance.",
        S.LEVEL: "Reste à voir si {subject} parvient à enchaîner après l'égalisation.",
        S.TRAILING: "Reste à voir si {subject} continue de pousser pour égaliser.",
    },
)
