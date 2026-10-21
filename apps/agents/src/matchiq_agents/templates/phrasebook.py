"""Locale phrase tables used by the deterministic template fallback and the mock provider.

Phrases never contain numbers: every number in rendered text comes from `computedMetrics`.
"""

from collections.abc import Mapping
from dataclasses import dataclass

from matchiq_agents.contracts.types import ConfidenceLabel, InsightKind


@dataclass(frozen=True, slots=True)
class Phrasebook:
    leads: Mapping[InsightKind, tuple[str, ...]]
    shorts: Mapping[InsightKind, str]
    generic_subject: str
    with_value: str
    qualitative: str
    metrics_title: str
    confidence_title: str
    confidence_labels: Mapping[ConfidenceLabel, str]
    counter_note: str
    limitation: str
    partial_coverage: str
    sides: Mapping[str, str]
    decimal_separator: str
