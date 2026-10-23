"""Demo fault scenarios (ADR-0020): deterministic, labelled, isolated and refused in prod."""

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel, HttpUrl, SecretStr, ValidationError

from matchiq_agents.app import create_app
from matchiq_agents.clock import Deadline
from matchiq_agents.contracts.generated.PipelineRequest import FaultScenario
from matchiq_agents.contracts.types import (
    AgentName,
    NarrativeSource,
    PipelineRequest,
    PipelineResult,
    PipelineStatus,
    RunOutcome,
)
from matchiq_agents.faults.constants import INJECTED_METRIC_REF, REASON_BREAKER_OPEN
from matchiq_agents.faults.model import FaultInjectingModel, corrupt_first_draft
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.roster.schemas import CitedValueOut, DraftOut, WriterOutput
from matchiq_agents.settings import AppEnvironment, ModelProvider, Settings
from matchiq_agents.wiring import build_service
from tests.conftest import TOKEN
from tests.support.builders import CaseSpec, build_payload, build_request
from tests.support.models import FakeClock, ScriptedModel

ENABLED = Settings(agents_service_token=SecretStr(TOKEN), demo_faults_enabled=True)
DISABLED = Settings(agents_service_token=SecretStr(TOKEN))
PROVIDERS = [pytest.param(MockModel, id="mock"), pytest.param(ScriptedModel, id="scripted")]


def faulted(scenario: FaultScenario) -> PipelineRequest:
    return build_request().model_copy(update={"fault": scenario})


async def run(
    request: PipelineRequest, model: ModelPort, settings: Settings = ENABLED
) -> PipelineResult:
    return await build_service(settings, FakeClock(), model).run(request)


def chain(result: PipelineResult) -> list[tuple[AgentName, RunOutcome]]:
    return [(r.agent, r.outcome) for r in result.runs]


@pytest.mark.parametrize("provider", PROVIDERS)
async def test_writer_revise_is_rejected_revised_and_passes(provider: type[ModelPort]) -> None:
    result = await run(faulted(FaultScenario.WRITER_REVISE), provider())
    assert result.status is PipelineStatus.VERIFIED
    writers = [r for r in result.runs if r.agent is AgentName.NARRATIVE_WRITER]
    checks = [r for r in result.runs if r.agent is AgentName.FACT_CHECKER]
    assert len(writers) == 2
    assert writers[0].faultNote is not None
    assert INJECTED_METRIC_REF in writers[0].faultNote
    assert checks[0].faultNote is not None
    assert "REVISE" in checks[0].faultNote
    assert INJECTED_METRIC_REF in checks[0].faultNote
    assert writers[1].faultNote is not None
    assert all(r.faultInjected is not None for r in result.runs)
    assert {r.faultInjected.value for r in result.runs if r.faultInjected} == {"WRITER_REVISE"}
    assert {d.source for d in result.narratives} == {NarrativeSource.AGENT}


@pytest.mark.parametrize("provider", PROVIDERS)
async def test_model_timeout_falls_back_to_templates_and_opens_an_isolated_breaker(
    provider: type[ModelPort],
) -> None:
    model = provider()
    orchestrator = build_service(ENABLED, FakeClock(), model)
    result = await orchestrator.run(faulted(FaultScenario.MODEL_TIMEOUT))
    assert result.status is PipelineStatus.FALLBACK
    assert chain(result)[:2] == [
        (AgentName.MATCH_ANALYST, RunOutcome.TIMED_OUT),
        (AgentName.MATCH_ANALYST, RunOutcome.FALLBACK),
    ]
    analyst = result.runs[0]
    assert analyst.retries == ENABLED.agent_max_retries
    writer = next(r for r in result.runs if r.agent is AgentName.NARRATIVE_WRITER)
    assert writer.outcome is RunOutcome.FAILED
    assert writer.faultNote is not None
    assert "Circuit breaker" in writer.faultNote
    assert result.fallbackReason is not None
    assert REASON_BREAKER_OPEN in result.fallbackReason
    assert {d.source for d in result.narratives} == {NarrativeSource.TEMPLATE}
    assert all(r.faultInjected is not None for r in result.runs)
    # The shared breaker never saw the simulated timeouts: the next real run is unaffected.
    clean = await orchestrator.run(build_request())
    assert clean.status is PipelineStatus.VERIFIED
    assert all(r.faultInjected is None for r in clean.runs)


async def test_the_same_fault_gives_the_same_chain_every_time() -> None:
    first = await run(faulted(FaultScenario.WRITER_REVISE), MockModel())
    second = await run(faulted(FaultScenario.WRITER_REVISE), MockModel())
    assert chain(first) == chain(second)
    assert [r.faultNote for r in first.runs] == [r.faultNote for r in second.runs]
    assert first.narratives == second.narratives


async def test_gate_reject_leaves_agent_output_untouched_but_labelled() -> None:
    result = await run(faulted(FaultScenario.GATE_REJECT), MockModel())
    assert result.status is PipelineStatus.VERIFIED
    assert all(r.faultInjected is not None for r in result.runs)
    assert all(r.faultNote is None for r in result.runs)


async def test_fault_is_ignored_when_demo_faults_are_disabled() -> None:
    result = await run(faulted(FaultScenario.MODEL_TIMEOUT), MockModel(), DISABLED)
    assert result.status is PipelineStatus.VERIFIED
    assert all(r.faultInjected is None for r in result.runs)


def test_demo_faults_are_refused_in_prod_at_startup() -> None:
    with pytest.raises(ValidationError, match="DEMO_FAULTS_ENABLED is not permitted in prod"):
        Settings(
            agents_service_token=SecretStr(TOKEN),
            app_env=AppEnvironment.PROD,
            model_provider=ModelProvider.FOUNDRY,
            foundry_project_endpoint=HttpUrl(
                "https://example.services.ai.azure.com/api/projects/p"
            ),
            foundry_model="gpt-4o-mini",
            demo_faults_enabled=True,
        )


def test_corruption_adds_an_ungrounded_citation_to_the_first_draft_only() -> None:
    draft = DraftOut(
        persona="CASUAL", headline="H", body="B", evidence_event_ids=["ev_1"], cited_values=[]
    )
    output, note = corrupt_first_draft(WriterOutput(drafts=[draft, draft]))
    assert output.drafts[0].cited_values == [
        CitedValueOut(metric_ref=INJECTED_METRIC_REF, value=99.0)
    ]
    assert output.drafts[1].cited_values == []
    assert note is not None
    assert "casual" in note


class _Empty(BaseModel):
    pass


async def test_timeout_decorator_never_calls_the_wrapped_model() -> None:
    inner = ScriptedModel()
    model = FaultInjectingModel(inner, FaultScenario.MODEL_TIMEOUT)
    with pytest.raises(TimeoutError):
        await model.generate(
            AgentName.MATCH_ANALYST, "", _Empty(), _Empty, Deadline.after(FakeClock(), 1_000)
        )
    assert inner.calls == {}
    assert model.calls[AgentName.MATCH_ANALYST] == 1


def test_api_returns_labelled_runs_on_the_wire() -> None:
    client = TestClient(create_app(ENABLED))
    payload = {**build_payload(CaseSpec()), "fault": "WRITER_REVISE"}
    res = client.post(
        "/api/v1/pipeline/runs", json=payload, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    assert res.status_code == 200
    runs = res.json()["runs"]
    assert {run["faultInjected"] for run in runs} == {"WRITER_REVISE"}
    assert any("faultNote" in run for run in runs)
