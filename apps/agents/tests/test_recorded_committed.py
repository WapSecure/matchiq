"""The committed recording replayed against real engine packets and demo faults (MQ-119).

`fixtures/comeback_requests.json` holds the 19 requests the worker builds for the Late comeback
template (engine algorithm 1.2.0), captured with the worker's `buildPipelineRequest`.
"""

import json
from pathlib import Path

import pytest
from pydantic import SecretStr

from matchiq_agents.api.pipeline import to_wire
from matchiq_agents.constants import REQUIRED_NULLABLE_FIELDS
from matchiq_agents.contracts.generated.PipelineRequest import FaultScenario
from matchiq_agents.contracts.types import (
    AgentName,
    NarrativeSource,
    PipelineRequest,
    PipelineResult,
    PipelineStatus,
    RunProvider,
)
from matchiq_agents.faults.constants import INJECTED_METRIC_REF
from matchiq_agents.pipeline.orchestrator import PipelineService
from matchiq_agents.settings import ModelProvider, Settings
from matchiq_agents.wiring import build_service
from tests.conftest import TOKEN
from tests.support.models import FakeClock
from tests.test_wire import nulls_below_the_top

FIXTURE = Path(__file__).parent / "fixtures" / "comeback_requests.json"
# Moments whose recorded wording passes today's checks for every persona (kind, period, minute).
PUBLISHABLE = {
    ("PRESSURE_SWING", 1, 18),
    ("HIGH_REGAINS", 1, 27),
    ("SHOT_BURST", 1, 22),
    ("SHOT_BURST", 1, 30),
    ("PRESSURE_SWING", 1, 36),
    ("PRESSURE_SWING", 2, 12),
    ("SHOT_BURST", 2, 23),
    ("HIGH_REGAINS", 2, 24),
    ("PRESSURE_SWING", 2, 27),
}
PARTLY = {("MOMENTUM_SHIFT", 1, 27)}


def requests(fault: FaultScenario | None = None) -> list[PipelineRequest]:
    loaded = [PipelineRequest.model_validate(item) for item in json.loads(FIXTURE.read_text())]
    return [r.model_copy(update={"fault": fault}) if fault else r for r in loaded]


def label(request: PipelineRequest) -> tuple[str, int, int]:
    insight = request.packet.insight
    return insight.kind.value, insight.period, insight.matchClockMs // 60_000


@pytest.fixture
def service() -> PipelineService:
    settings = Settings(
        agents_service_token=SecretStr(TOKEN),
        model_provider=ModelProvider.RECORDED,
        recorded_latency_ms=0,
        demo_faults_enabled=True,
    )
    return build_service(settings, FakeClock())


async def test_every_moment_matches_and_the_wire_body_has_no_empty_optionals(
    service: PipelineService,
) -> None:
    published: set[tuple[str, int, int]] = set()
    partly: set[tuple[str, int, int]] = set()
    for request in requests():
        result = await service.run(request)
        assert RunProvider.recorded in {run.provider for run in result.runs}
        wire = to_wire(result)
        assert PipelineResult.model_validate(wire).runId == result.runId
        optional = {k: v for k, v in wire.items() if k not in REQUIRED_NULLABLE_FIELDS}
        assert nulls_below_the_top(optional) == []
        sources = {n.source for n in result.narratives}
        if sources == {NarrativeSource.AGENT}:
            published.add(label(request))
        elif NarrativeSource.AGENT in sources:
            partly.add(label(request))
    assert published == PUBLISHABLE
    assert partly == PARTLY


async def test_stale_goal_and_momentum_wording_is_rejected_with_the_real_reason(
    service: PipelineService,
) -> None:
    goal = next(r for r in requests() if label(r) == ("GOAL", 1, 22))
    result = await service.run(goal)
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason is not None
    assert "fact checker rejected drafts" in result.fallbackReason
    assert {n.source for n in result.narratives} == {NarrativeSource.TEMPLATE}


async def test_writer_revise_catches_the_injected_number_then_the_recorded_draft_passes(
    service: PipelineService,
) -> None:
    request = next(
        r for r in requests(FaultScenario.WRITER_REVISE) if label(r) == ("PRESSURE_SWING", 1, 18)
    )
    result = await service.run(request)
    assert result.status is PipelineStatus.VERIFIED
    writers = [r for r in result.runs if r.agent is AgentName.NARRATIVE_WRITER]
    checks = [r for r in result.runs if r.agent is AgentName.FACT_CHECKER]
    assert len(writers) == len(checks) == 2
    assert INJECTED_METRIC_REF in (writers[0].faultNote or "")
    assert "REVISE" in (checks[0].faultNote or "")
    assert all(run.faultInjected is not None for run in result.runs)
    assert {n.source for n in result.narratives} == {NarrativeSource.AGENT}
    cited = {c.metricRef for n in result.narratives for c in n.citedValues}
    assert INJECTED_METRIC_REF not in cited
    decisions = [(s.role.value, s.decision.value) for s in result.steps or []]
    assert ("FACT_CHECKER", "REVISE") in decisions
    assert decisions.count(("FACT_CHECKER", "PASS")) == 1


async def test_model_timeout_airs_templates_and_labels_the_simulated_failure(
    service: PipelineService,
) -> None:
    result = await service.run(requests(FaultScenario.MODEL_TIMEOUT)[0])
    assert {n.source for n in result.narratives} == {NarrativeSource.TEMPLATE}
    assert all(run.faultInjected is not None for run in result.runs)
    assert RunProvider.recorded not in {run.provider for run in result.runs}


async def test_a_fault_is_ignored_when_demo_faults_are_off() -> None:
    settings = Settings(
        agents_service_token=SecretStr(TOKEN),
        model_provider=ModelProvider.RECORDED,
        recorded_latency_ms=0,
    )
    plain = build_service(settings, FakeClock())
    for scenario in (FaultScenario.WRITER_REVISE, FaultScenario.MODEL_TIMEOUT):
        request = requests(scenario)[0]
        result = await plain.run(request)
        assert all(run.faultInjected is None for run in result.runs)
        assert RunProvider.recorded in {run.provider for run in result.runs}
