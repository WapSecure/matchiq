from typing import Any

import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from pydantic import BaseModel, SecretStr, ValidationError

from matchiq_agents.contracts.types import (
    AgentName,
    AgentStep,
    AgentStepDecision,
    AgentStepRole,
    PipelineResult,
    PipelineStatus,
)
from matchiq_agents.models.mock import MockModel
from matchiq_agents.models.port import ModelPort
from matchiq_agents.pipeline import budget as budget_module
from matchiq_agents.pipeline import orchestrator as orchestrator_module
from matchiq_agents.pipeline.steps import BUDGET_EXCEEDED, checksum
from matchiq_agents.roster.schemas import WriterOutput
from matchiq_agents.settings import Settings
from matchiq_agents.telemetry import agent_spans
from matchiq_agents.wiring import build_orchestrator
from tests.conftest import TOKEN
from tests.support.builders import CaseSpec, build_payload, build_request
from tests.support.models import FakeClock, ScriptedModel

R = AgentStepRole
ROSTER = [R.MATCH_ANALYST, R.NARRATIVE_WRITER, R.FACT_CHECKER, R.LOCALIZATION]


def _settings(**overrides: Any) -> Settings:
    return Settings(agents_service_token=SecretStr(TOKEN), **overrides)


def _steps(result: PipelineResult) -> list[AgentStep]:
    assert result.steps is not None
    return result.steps


async def _run(model: ModelPort, **overrides: Any) -> PipelineResult:
    return await build_orchestrator(_settings(**overrides), FakeClock(), model).run(build_request())


async def test_happy_path_records_one_step_per_handoff() -> None:
    result = await _run(MockModel())
    roles = [step.role for step in _steps(result)]
    assert roles == [*ROSTER, R.BROADCAST_PRODUCER]
    assert [step.stepIndex for step in _steps(result)] == list(range(len(roles)))
    assert all(step.decision is AgentStepDecision.PASS for step in _steps(result))
    assert all(step.correlationId == result.correlationId for step in _steps(result))
    assert all(step.runId == result.runId for step in _steps(result))
    analyst, writer = _steps(result)[0], _steps(result)[1]
    assert (analyst.fromStatus.value, analyst.toStatus.value) == ("DETECTED", "ANALYZED")
    assert (writer.fromStatus.value, writer.toStatus.value) == ("ANALYZED", "DRAFTED")
    assert analyst.agentVersion.promptHash is not None


async def test_steps_cite_only_evidence_from_the_request() -> None:
    result = await _run(MockModel())
    payload = build_payload(CaseSpec())
    evidence = payload["packet"]["insight"]["evidence"]
    allowed_events = set(evidence["eventIds"])
    allowed_refs = set(evidence["computedMetrics"])
    for step in _steps(result):
        assert step.evidenceEventIds, step.role
        assert {event.root for event in step.evidenceEventIds} <= allowed_events
        assert {ref.root for ref in step.metricRefs} <= allowed_refs


async def test_input_checksums_are_deterministic_and_distinct() -> None:
    first = await _run(MockModel())
    second = await _run(MockModel())
    sums = [step.inputChecksum for step in _steps(first)]
    assert sums == [step.inputChecksum for step in _steps(second)]
    assert len(set(sums)) == len(sums)


def test_checksum_is_canonical() -> None:
    assert checksum({"b": 1, "a": [1, "é"]}) == checksum({"a": [1, "é"], "b": 1})
    assert checksum({"a": 1}) != checksum({"a": 2})
    assert len(checksum({})) == 64


async def test_revision_is_recorded_as_a_revise_handoff() -> None:
    def bad_first(answer: BaseModel, count: int) -> BaseModel | None:
        assert isinstance(answer, WriterOutput)
        if count > 1:
            return None
        drafts = [
            d.model_copy(update={"body": d.body.rstrip(".") + " with nine goals."})
            for d in answer.drafts
        ]
        return answer.model_copy(update={"drafts": drafts})

    result = await _run(ScriptedModel({AgentName.NARRATIVE_WRITER: bad_first}))
    roles = [step.role for step in _steps(result)]
    assert roles[:5] == [*ROSTER[:3], R.NARRATIVE_WRITER, R.FACT_CHECKER]
    revise = _steps(result)[2]
    assert revise.decision is AgentStepDecision.REVISE
    assert revise.reasonCode == "REVISION_REQUESTED"
    assert _steps(result)[1].tokensIn == 10


async def test_hop_budget_falls_back_cleanly() -> None:
    result = await _run(ScriptedModel(), agent_budget_max_hops=1)
    assert result.status is PipelineStatus.FALLBACK
    assert result.fallbackReason is not None
    assert "budget" in result.fallbackReason
    writer = _steps(result)[1]
    assert writer.role is R.NARRATIVE_WRITER
    assert writer.decision is AgentStepDecision.FALLBACK
    assert writer.reasonCode == BUDGET_EXCEEDED
    assert result.narratives
    assert _steps(result)[0].decision is AgentStepDecision.PASS


async def test_token_budget_stops_further_model_calls() -> None:
    model = ScriptedModel()
    result = await _run(model, agent_budget_max_tokens=20)
    assert any(step.reasonCode == BUDGET_EXCEEDED for step in _steps(result))
    assert sum(model.calls.values()) == 2
    assert result.status is PipelineStatus.FALLBACK


async def test_cost_budget_uses_the_price_table() -> None:
    prices = {"scripted-test": {"inputPerMTok": 100_000, "outputPerMTok": 100_000}}
    model = ScriptedModel()
    result = await _run(model, agent_budget_max_cost_usd=0.5, agent_price_table=prices)
    assert sum(model.calls.values()) == 1
    assert _steps(result)[0].costEstimateUsd == pytest.approx(1.5)
    assert _steps(result)[1].reasonCode == BUDGET_EXCEEDED


def test_budget_settings_are_validated() -> None:
    with pytest.raises(ValidationError):
        _settings(agent_budget_max_hops=0)
    with pytest.raises(ValidationError):
        _settings(agent_budget_max_cost_usd=0)
    assert _settings(agent_budget_max_tokens=10).run_budget.max_tokens == 10


def test_unlimited_budget_never_refuses() -> None:
    run_budget = budget_module.RunBudget()
    run_budget.charge(10**9, 10**9, 10**6)
    assert run_budget.allow()


async def test_each_step_emits_a_genai_span(monkeypatch: pytest.MonkeyPatch) -> None:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    monkeypatch.setattr(agent_spans.trace, "get_tracer", provider.get_tracer)
    result = await _run(ScriptedModel())
    spans = [span for span in exporter.get_finished_spans() if span.name.startswith("invoke")]
    assert len(spans) == len(_steps(result))
    analyst = next(span for span in spans if span.name == "invoke_agent MATCH_ANALYST")
    attributes = dict(analyst.attributes or {})
    assert attributes["gen_ai.operation.name"] == "invoke_agent"
    assert attributes["gen_ai.system"] == "foundry"
    assert attributes["gen_ai.request.model"] == "scripted-test"
    assert attributes["gen_ai.usage.input_tokens"] == 10
    assert attributes["gen_ai.usage.output_tokens"] == 5
    assert attributes["matchiq.correlation_id"] == str(result.correlationId)


async def test_orchestration_failure_records_an_emergency_step(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def explode(*_: object) -> None:
        raise RuntimeError("graph failed")

    monkeypatch.setattr(orchestrator_module, "build_workflow", explode)
    result = await _run(MockModel())
    [step] = _steps(result)
    assert step.role is R.TEMPLATE_FALLBACK
    assert step.decision is AgentStepDecision.FALLBACK
    assert step.reasonCode == "ORCHESTRATION_ERROR"
    assert step.toStatus.value == "FALLBACK"
