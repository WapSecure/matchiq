"""Immutable, normalised view of one pipeline request shared by every agent (spec §46)."""

from dataclasses import dataclass
from types import MappingProxyType
from typing import Final
from uuid import UUID

from matchiq_agents.contracts.types import (
    ConfidenceLabel,
    InsightKind,
    InsightPriority,
    Locale,
    Persona,
    PipelineRequest,
)
from matchiq_agents.guard.text import is_safe_entity_name, name_tokens

CANONICAL_LOCALE: Final = Locale.en_GB


@dataclass(frozen=True, slots=True)
class FactView:
    run_id: str
    correlation_id: UUID
    fixture_id: str
    kind: InsightKind
    priority: InsightPriority
    team_name: str | None
    player_name: str | None
    metrics: MappingProxyType[str, float]
    event_ids: tuple[str, ...]
    confidence: ConfidenceLabel
    data_coverage: float
    rationale: str
    counter_evidence: tuple[str, ...]
    entity_names: frozenset[str]
    unsafe_entity_names: frozenset[str]
    personas: tuple[Persona, ...]
    locales: tuple[Locale, ...]
    deadline_ms: int

    @property
    def allowed_name_tokens(self) -> frozenset[str]:
        return frozenset(token for name in self.entity_names for token in name_tokens(name))

    @property
    def has_metrics(self) -> bool:
        return bool(self.metrics)


def _ordered_unique[T](items: list[T]) -> tuple[T, ...]:
    return tuple(dict.fromkeys(items))


def build_fact_view(request: PipelineRequest) -> FactView:
    packet = request.packet
    insight = packet.insight
    teams = {team.teamId: team.name for team in packet.entities.teams}
    players = {player.playerId: player.displayName for player in packet.entities.players}
    names = [*teams.values(), *players.values()]
    safe = frozenset(name for name in names if is_safe_entity_name(name))
    team_name = teams.get(insight.teamId) if insight.teamId else None
    player_name = players.get(insight.playerId) if insight.playerId else None
    return FactView(
        run_id=packet.runId,
        correlation_id=packet.correlationId,
        fixture_id=packet.fixtureId,
        kind=insight.kind,
        priority=insight.priority,
        team_name=team_name if team_name in safe else None,
        player_name=player_name if player_name in safe else None,
        metrics=MappingProxyType(dict(sorted(insight.evidence.computedMetrics.items()))),
        event_ids=_ordered_unique([event.root for event in insight.evidence.eventIds]),
        confidence=ConfidenceLabel(insight.evidence.confidenceLabel.value),
        data_coverage=insight.evidence.dataCoverage,
        rationale=insight.evidence.rationale,
        counter_evidence=tuple(item.description for item in insight.evidence.counterEvidence),
        entity_names=safe,
        unsafe_entity_names=frozenset(names) - safe,
        personas=_ordered_unique([Persona(p.value) for p in request.personas]),
        locales=_ordered_unique([Locale(loc.value) for loc in request.locales]),
        deadline_ms=packet.deadlineMs,
    )


def integrity_problems(request: PipelineRequest) -> list[str]:
    """Packet inconsistencies that make the insight unsafe to narrate at all."""
    packet = request.packet
    insight = packet.insight
    problems: list[str] = []
    if insight.fixtureId != packet.fixtureId or insight.evidence.fixtureId != packet.fixtureId:
        problems.append("insight fixture does not match packet fixture")
    if insight.evidence.insightId != insight.insightId:
        problems.append("evidence envelope belongs to a different insight")
    team_ids = {team.teamId for team in packet.entities.teams}
    if insight.teamId and insight.teamId not in team_ids:
        problems.append("insight team is not in the entity allowlist")
    player_ids = {player.playerId for player in packet.entities.players}
    if insight.playerId and insight.playerId not in player_ids:
        problems.append("insight player is not in the entity allowlist")
    return problems
