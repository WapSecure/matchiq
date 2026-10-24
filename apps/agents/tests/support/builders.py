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
    # Squad-sized allowlist, as the worker sends for a real fixture (36 players).
    squad_players: int = 0
    # The engine's `MomentContext` (MQ-068); None for packets that predate it.
    context: dict[str, Any] | None = None


FIRST_NAMES = ("Arlo", "Bram", "Cael", "Dario", "Emil", "Fenn")
LAST_NAMES = ("Ashby", "Brook", "Calder", "Dunmore", "Ellery", "Fairley")


def squad(count: int) -> list[dict[str, str]]:
    names = [f"{first} {last}" for first in FIRST_NAMES for last in LAST_NAMES][:count]
    return [
        {"playerId": f"pl_squad_{index}", "teamId": HOME if index % 2 else AWAY, "displayName": n}
        for index, n in enumerate(names)
    ]


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
        "players": [
            {"playerId": STAR, "teamId": HOME, "displayName": spec.player_name},
            *squad(spec.squad_players),
        ],
    }
    if spec.context is not None:
        insight["context"] = copy.deepcopy(spec.context)
    packet["deadlineMs"] = spec.deadline_ms
    payload["personas"] = list(spec.personas)
    payload["locales"] = list(spec.locales)
    return payload


def build_request(spec: CaseSpec | None = None) -> PipelineRequest:
    return PipelineRequest.model_validate(build_payload(spec or CaseSpec()))


SPELL_REFS = ("context.trend.spell1", "context.trend.spell2", "context.trend.spell3")
SPELLS = {"RISING": (1, 2, 4), "FALLING": (4, 2, 1), "STEADY": (2, 2, 2), "MIXED": (2, 4, 1)}


def moment_context(
    side: str = "home",
    *,
    score: tuple[int, int] = (2, 1),
    minute: int = 67,
    phase: str = "SECOND_HALF",
    metric: str = "shots",
    direction: str = "RISING",
    regain: tuple[str, int] | None = None,
    previous_minute: int | None = None,
) -> dict[str, Any]:
    """A realistic `MomentContext`: the score from the subject side, the last 10 minutes
    against the match average, and three spells of `metric` that follow `direction`."""
    home, away = score
    mine, theirs = (home, away) if side == "home" else (away, home)
    state = "LEADING" if mine > theirs else "LEVEL" if mine == theirs else "TRAILING"
    other = "away" if side == "home" else "home"
    metrics: dict[str, float] = {
        "context.score.home": home,
        "context.score.away": away,
        "context.score.margin": abs(home - away),
        "context.minute": minute,
        "context.compare.windowMinutes": 10,
        f"context.compare.recent.{side}": 5,
        f"context.compare.recent.{other}": 1,
        f"context.compare.average.{side}": 1.8,
        f"context.compare.average.{other}": 1.2,
        **dict(zip(SPELL_REFS, SPELLS[direction], strict=True)),
    }
    linked: dict[str, str] = {}
    event_ids: list[str] = []
    if regain is not None:
        linked["regainEventId"] = regain[0]
        event_ids.append(regain[0])
        metrics["context.linked.regainSeconds"] = regain[1]
    if previous_minute is not None:
        linked["previousInsightId"] = "in_previous_1"
        metrics["context.linked.previousMinute"] = previous_minute
    return {
        "methodVersion": "1.0.0",
        "side": side,
        "scoreState": state,
        "phase": phase,
        "comparison": {"metric": metric},
        "trend": {"metric": metric, "direction": direction},
        "linked": linked,
        "eventIds": event_ids,
        "metrics": metrics,
    }
