"""Human labels for metric families (the first segment of a `metricRef`), singular and plural."""

import re
from typing import Final

from matchiq_agents.contracts.types import Locale
from matchiq_agents.domain.story import family_of

_L = Locale
Forms = tuple[str, str]

METRIC_LABELS: Final[dict[str, dict[Locale, Forms]]] = {
    "goals": {
        _L.en_GB: ("goal", "goals"),
        _L.fr_FR: ("but", "buts"),
        _L.es_ES: ("gol", "goles"),
        _L.pcm_NG: ("goal", "goals"),
    },
    "shots": {
        _L.en_GB: ("shot", "shots"),
        _L.fr_FR: ("tir", "tirs"),
        _L.es_ES: ("tiro", "tiros"),
        _L.pcm_NG: ("shot", "shots"),
    },
    "shotsOnTarget": {
        _L.en_GB: ("shot on target", "shots on target"),
        _L.fr_FR: ("tir cadré", "tirs cadrés"),
        _L.es_ES: ("tiro a puerta", "tiros a puerta"),
        _L.pcm_NG: ("shot on target", "shots on target"),
    },
    "highRecoveries": {
        _L.en_GB: ("high recovery", "high recoveries"),
        _L.fr_FR: ("récupération haute", "récupérations hautes"),
        _L.es_ES: ("recuperación alta", "recuperaciones altas"),
        _L.pcm_NG: ("high recovery", "high recoveries"),
    },
    "recoveries": {
        _L.en_GB: ("recovery", "recoveries"),
        _L.fr_FR: ("récupération", "récupérations"),
        _L.es_ES: ("recuperación", "recuperaciones"),
        _L.pcm_NG: ("ball recovery", "ball recoveries"),
    },
    "pressures": {
        _L.en_GB: ("pressure", "pressures"),
        _L.fr_FR: ("pressing", "pressings"),
        _L.es_ES: ("presión", "presiones"),
        _L.pcm_NG: ("pressure", "pressures"),
    },
    "finalThirdEntries": {
        _L.en_GB: ("final-third entry", "final-third entries"),
        _L.fr_FR: ("entrée dans le dernier tiers", "entrées dans le dernier tiers"),
        _L.es_ES: ("llegada al último tercio", "llegadas al último tercio"),
        _L.pcm_NG: ("final-third entry", "final-third entries"),
    },
    "possession": {
        _L.en_GB: ("possession", "possession"),
        _L.fr_FR: ("de possession", "de possession"),
        _L.es_ES: ("de posesión", "de posesión"),
        _L.pcm_NG: ("possession", "possession"),
    },
    "passes": {
        _L.en_GB: ("pass", "passes"),
        _L.fr_FR: ("passe", "passes"),
        _L.es_ES: ("pase", "pases"),
        _L.pcm_NG: ("pass", "passes"),
    },
    "xg": {
        _L.en_GB: ("expected goals", "expected goals"),
        _L.fr_FR: ("but attendu", "buts attendus"),
        _L.es_ES: ("gol esperado", "goles esperados"),
        _L.pcm_NG: ("expected goals", "expected goals"),
    },
    "fouls": {
        _L.en_GB: ("foul", "fouls"),
        _L.fr_FR: ("faute", "fautes"),
        _L.es_ES: ("falta", "faltas"),
        _L.pcm_NG: ("foul", "fouls"),
    },
    "redCards": {
        _L.en_GB: ("red card", "red cards"),
        _L.fr_FR: ("carton rouge", "cartons rouges"),
        _L.es_ES: ("tarjeta roja", "tarjetas rojas"),
        _L.pcm_NG: ("red card", "red cards"),
    },
    "touches": {
        _L.en_GB: ("touch", "touches"),
        _L.fr_FR: ("ballon touché", "ballons touchés"),
        _L.es_ES: ("toque", "toques"),
        _L.pcm_NG: ("touch", "touches"),
    },
    "momentum": {
        _L.en_GB: ("momentum index", "momentum index"),
        _L.fr_FR: ("indice de dynamique", "indice de dynamique"),
        _L.es_ES: ("índice de impulso", "índice de impulso"),
        _L.pcm_NG: ("momentum index", "momentum index"),
    },
}

# Families shown as a share: the value gets a percent sign ("58% possession").
PERCENT_FAMILIES: Final = frozenset({"possession", "passCompletionPct", "possessionPct"})
PERCENT: Final = "%"

_CAMEL_BOUNDARY: Final = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


def metric_label(metric_ref: str, locale: Locale, value: float = 2) -> str:
    family = family_of(metric_ref)
    labels = METRIC_LABELS.get(family)
    if labels is None:
        return _CAMEL_BOUNDARY.sub(" ", family).lower()
    singular, plural = labels[locale]
    return singular if value == 1 else plural


def value_suffix(metric_ref: str) -> str:
    return PERCENT if family_of(metric_ref) in PERCENT_FAMILIES else ""
