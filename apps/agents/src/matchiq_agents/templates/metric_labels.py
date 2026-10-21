"""Human labels for metric families (the first segment of a `metricRef`)."""

import re
from typing import Final

from matchiq_agents.contracts.types import InsightKind, Locale

_L = Locale
METRIC_LABELS: Final[dict[str, dict[Locale, str]]] = {
    "goals": {_L.en_GB: "goals", _L.fr_FR: "buts", _L.es_ES: "goles"},
    "shots": {_L.en_GB: "shots", _L.fr_FR: "tirs", _L.es_ES: "tiros"},
    "shotsOnTarget": {
        _L.en_GB: "shots on target",
        _L.fr_FR: "tirs cadrés",
        _L.es_ES: "tiros a puerta",
    },
    "highRecoveries": {
        _L.en_GB: "high recoveries",
        _L.fr_FR: "récupérations hautes",
        _L.es_ES: "recuperaciones altas",
    },
    "recoveries": {_L.en_GB: "recoveries", _L.fr_FR: "récupérations", _L.es_ES: "recuperaciones"},
    "pressures": {_L.en_GB: "pressures", _L.fr_FR: "pressings", _L.es_ES: "presiones"},
    "possession": {_L.en_GB: "possession", _L.fr_FR: "possession", _L.es_ES: "posesión"},
    "passes": {_L.en_GB: "passes", _L.fr_FR: "passes", _L.es_ES: "pases"},
    "xg": {_L.en_GB: "expected goals", _L.fr_FR: "buts attendus", _L.es_ES: "goles esperados"},
    "corners": {_L.en_GB: "corners", _L.fr_FR: "corners", _L.es_ES: "córneres"},
    "fouls": {_L.en_GB: "fouls", _L.fr_FR: "fautes", _L.es_ES: "faltas"},
    "redCards": {_L.en_GB: "red cards", _L.fr_FR: "cartons rouges", _L.es_ES: "tarjetas rojas"},
    "yellowCards": {
        _L.en_GB: "yellow cards",
        _L.fr_FR: "cartons jaunes",
        _L.es_ES: "tarjetas amarillas",
    },
    "touches": {_L.en_GB: "touches", _L.fr_FR: "touches", _L.es_ES: "toques"},
    "momentum": {
        _L.en_GB: "momentum index",
        _L.fr_FR: "indice de dynamique",
        _L.es_ES: "índice de impulso",
    },
}

PRIMARY_FAMILIES: Final[dict[InsightKind, tuple[str, ...]]] = {
    InsightKind.GOAL: ("goals",),
    InsightKind.RED_CARD: ("redCards",),
    InsightKind.SHOT_BURST: ("shots", "shotsOnTarget", "xg"),
    InsightKind.HIGH_REGAINS: ("highRecoveries", "recoveries"),
    InsightKind.PRESSURE_SWING: ("pressures", "highRecoveries", "recoveries"),
    InsightKind.MOMENTUM_SHIFT: ("momentum", "shots", "possession"),
    InsightKind.PLAYER_MILESTONE: ("touches", "passes", "goals"),
}

_CAMEL_BOUNDARY: Final = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


def family_of(metric_ref: str) -> str:
    return metric_ref.split(".", 1)[0]


def side_of(metric_ref: str) -> str | None:
    parts = metric_ref.split(".")
    return next((part for part in parts[1:] if part in {"home", "away"}), None)


def metric_label(metric_ref: str, locale: Locale) -> str:
    family = family_of(metric_ref)
    labels = METRIC_LABELS.get(family)
    if labels is not None:
        return labels[locale]
    return _CAMEL_BOUNDARY.sub(" ", family).lower()


def primary_metric(kind: InsightKind, metric_refs: list[str]) -> str | None:
    """The metric a one-line narrative should lead with, or None when nothing fits the kind."""
    for family in PRIMARY_FAMILIES[kind]:
        match = next((ref for ref in metric_refs if family_of(ref) == family), None)
        if match is not None:
            return match
    return None
