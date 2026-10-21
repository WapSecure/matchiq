"""Builds `PipelineRequest` payloads from the shared contract sample."""

import copy
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from matchiq_agents.contracts.types import PipelineRequest

SAMPLES_DIR = Path(__file__).resolve().parents[4] / "libs" / "contracts" / "samples"
SAMPLE_REQUEST: dict[str, Any] = json.loads((SAMPLES_DIR / "PipelineRequest.json").read_text())
HOME = "tm_harbour"
AWAY = "tm_northgate"
STAR = "pl_harbour_9"


@dataclass(frozen=True)
class CaseSpec:
    kind: str = "HIGH_REGAINS"
    priority: str = "P1"
    metrics: dict[str, float] = field(
        default_factory=lambda: {"highRecoveries.home.rolling5m": 5, "shots.home.rolling5m": 3}
    )
    personas: tuple[str, ...] = ("CASUAL", "ANALYST", "BROADCAST")
    locales: tuple[str, ...] = ("en-GB", "fr-FR", "es-ES", "pcm-NG")
    team_id: str | None = HOME
    player_id: str | None = None
    team_name: str = "Harbour City"
    away_name: str = "Northgate Rovers"
    player_name: str = "Tomas Varell"
    rationale: str = "Five high recoveries in five minutes."
    counter_evidence: tuple[str, ...] = ("Northgate also registered two shots in the window.",)
    coverage: float = 1.0
    confidence: str = "medium"
    deadline_ms: int = 8000
    event_ids: tuple[str, ...] = ("ev_00101", "ev_00112", "ev_00127")


def build_payload(spec: CaseSpec) -> dict[str, Any]:
    payload = copy.deepcopy(SAMPLE_REQUEST)
    packet = payload["packet"]
    insight = packet["insight"]
    evidence = insight["evidence"]
    insight.update(kind=spec.kind, priority=spec.priority)
    for key, value in (("teamId", spec.team_id), ("playerId", spec.player_id)):
        if value is None:
            insight.pop(key, None)
        else:
            insight[key] = value
    evidence.update(
        computedMetrics=dict(spec.metrics),
        rationale=spec.rationale,
        dataCoverage=spec.coverage,
        confidenceLabel=spec.confidence,
        eventIds=list(spec.event_ids),
        counterEvidence=[
            {"description": text, "eventIds": [spec.event_ids[0]]} for text in spec.counter_evidence
        ],
    )
    packet["entities"] = {
        "teams": [
            {"teamId": HOME, "name": spec.team_name},
            {"teamId": AWAY, "name": spec.away_name},
        ],
        "players": [{"playerId": STAR, "teamId": HOME, "displayName": spec.player_name}],
    }
    packet["deadlineMs"] = spec.deadline_ms
    payload["personas"] = list(spec.personas)
    payload["locales"] = list(spec.locales)
    return payload


def build_request(spec: CaseSpec | None = None) -> PipelineRequest:
    return PipelineRequest.model_validate(build_payload(spec or CaseSpec()))
